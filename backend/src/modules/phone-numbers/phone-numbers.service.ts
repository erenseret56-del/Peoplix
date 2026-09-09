import twilio from 'twilio';
import { getCollection, Collections } from '../../infrastructure/database/index.js';
import { companiesRepository } from '../companies/companies.repository.js';
import { aiConfigRepository } from '../ai-config/ai-config.repository.js';
import { retellClient } from '../retell/retell.client.js';
import { config } from '../../config/env.js';
import { NotFoundError } from '../../middleware/errorHandler.js';

function getTwilioClient() {
  if (!config.twilio.accountSid || !config.twilio.authToken) {
    throw new Error('Twilio is not configured. Set TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN.');
  }
  return twilio(config.twilio.accountSid, config.twilio.authToken);
}

export async function addNumberToSipTrunk(phoneNumberSid: string) {
  if (!config.twilio.sipTrunkSid) {
    throw new Error('TWILIO_SIP_TRUNK_SID is not configured. The number was not assigned.');
  }

  await getTwilioClient().trunking.v1
    .trunks(config.twilio.sipTrunkSid)
    .phoneNumbers.create({ phoneNumberSid });
}

export async function syncNumbersToSipTrunk() {
  if (!config.twilio.sipTrunkSid) {
    throw new Error('TWILIO_SIP_TRUNK_SID is not configured.');
  }

  const client = getTwilioClient();
  const [ownedNumbers, trunkNumbers] = await Promise.all([
    client.incomingPhoneNumbers.list({ limit: 1000 }),
    client.trunking.v1.trunks(config.twilio.sipTrunkSid).phoneNumbers.list({ limit: 1000 }),
  ]);
  const attachedNumbers = new Set(trunkNumbers.map((number) => number.phoneNumber));
  const missingNumbers = ownedNumbers.filter((number) => !attachedNumbers.has(number.phoneNumber));

  for (const number of missingNumbers) {
    await addNumberToSipTrunk(number.sid);
  }

  return { attached: missingNumbers.length, total: ownedNumbers.length };
}

async function bindNumberToCompanyAgent(companyId: string, phoneNumber: string) {
  if (!config.retell.twilioTerminationUri) {
    throw new Error('RETELL_TWILIO_TERMINATION_URI is not configured. The number was not assigned.');
  }

  const aiConfig = await aiConfigRepository.findByCompanyId(companyId);
  const agentId = aiConfig?.retell_agent_id || config.retell.agentId;
  if (!agentId) {
    throw new Error('No Retell agent is configured for this company. Configure the company AI agent before assigning a number.');
  }

  const agent = await retellClient.getAgent(agentId);
  if (!agent?.agent_id) {
    throw new Error('The configured Retell agent could not be found.');
  }

  await retellClient.importPhoneNumber(
    phoneNumber,
    config.retell.twilioTerminationUri,
    agentId,
    `${phoneNumber} - ${agent.agent_name}`,
    config.retell.inboundWebhookUrl,
  );

  return agentId;
}

export class PhoneNumbersService {
  async listAvailable(countryCode = config.twilio.countryCode) {
    const client = getTwilioClient();
    const numbers = await client.availablePhoneNumbers(countryCode).local.list({
      voiceEnabled: true,
      smsEnabled: true,
      limit: 50,
    });

    return numbers.map((number) => ({
      phone_number: number.phoneNumber,
      friendly_name: number.friendlyName,
      locality: number.locality,
      region: number.region,
      postal_code: number.postalCode,
      capabilities: number.capabilities,
    }));
  }

  async listReserved() {
    const [twilioNumbers, assignments] = await Promise.all([
      getTwilioClient().incomingPhoneNumbers.list({ limit: 1000 }),
      getCollection(Collections.PHONE_ASSIGNMENTS).find({ status: 'assigned' }).toArray(),
    ]);
    const assignmentsBySid = new Map(assignments.map((assignment) => [assignment.twilio_sid, assignment]));

    return Promise.all(twilioNumbers.map(async (number) => {
      const assignment = assignmentsBySid.get(number.sid);
      const company = assignment ? await companiesRepository.findById(String(assignment.company_id)) : null;
      return {
        id: number.sid,
        phone_number: number.phoneNumber,
        twilio_sid: number.sid,
        status: assignment?.status || 'reserved',
        assigned_at: assignment?.assigned_at || null,
        company_id: assignment?.company_id || null,
        company_name: company?.name || 'Unknown company',
      };
    }));
  }

  async purchaseAndAssign(companyId: string, countryCode = config.twilio.countryCode) {
    const company = await companiesRepository.findById(companyId);
    if (!company) throw new NotFoundError('Company not found');

    const twilioClient = getTwilioClient();
    const available = await this.listAvailable(countryCode);
    const selected = available[0];
    if (!selected) throw new Error(`No available Twilio numbers found for ${countryCode}.`);

    const purchased = await twilioClient.incomingPhoneNumbers.create({
      phoneNumber: selected.phone_number,
    });
    await addNumberToSipTrunk(purchased.sid);
    await bindNumberToCompanyAgent(companyId, purchased.phoneNumber);
    const now = new Date();
    const result = await getCollection(Collections.PHONE_ASSIGNMENTS).insertOne({
      company_id: companyId,
      phone_number: purchased.phoneNumber,
      normalized_phone_number: purchased.phoneNumber.replace(/\D/g, ''),
      twilio_sid: purchased.sid,
      status: 'assigned',
      assigned_at: now,
      created_at: now,
      updated_at: now,
    });

    return {
      id: result.insertedId.toString(),
      phone_number: purchased.phoneNumber,
      twilio_sid: purchased.sid,
      company_id: companyId,
      company_name: company.name,
      assigned_at: now,
      reused: false,
    };
  }

  async assignExisting(companyId: string, twilioSid: string) {
    const company = await companiesRepository.findById(companyId);
    if (!company) throw new NotFoundError('Company not found');

    const twilioNumber = (await getTwilioClient().incomingPhoneNumbers.list({ limit: 1000 }))
      .find((number) => number.sid === twilioSid);
    if (!twilioNumber) throw new NotFoundError('Available Twilio number not found');

    const alreadyAssigned = await getCollection(Collections.PHONE_ASSIGNMENTS).findOne({ twilio_sid: twilioSid, status: 'assigned' });
    if (alreadyAssigned) throw new Error('This number is already assigned to another client.');

    const now = new Date();
    await addNumberToSipTrunk(twilioNumber.sid);
    await bindNumberToCompanyAgent(companyId, twilioNumber.phoneNumber);
    const released = await getCollection(Collections.PHONE_ASSIGNMENTS).findOne({ twilio_sid: twilioSid, status: 'available' });
    if (released) {
      await getCollection(Collections.PHONE_ASSIGNMENTS).updateOne(
        { _id: released._id },
        { $set: { company_id: companyId, status: 'assigned', assigned_at: now, released_at: null, updated_at: now } },
      );
      return { id: released._id!.toString(), phone_number: released.phone_number, twilio_sid: twilioSid, company_id: companyId, company_name: company.name, assigned_at: now, reused: true };
    }

    const result = await getCollection(Collections.PHONE_ASSIGNMENTS).insertOne({
      company_id: companyId,
      phone_number: twilioNumber.phoneNumber,
      normalized_phone_number: twilioNumber.phoneNumber.replace(/\D/g, ''),
      twilio_sid: twilioSid,
      status: 'assigned',
      assigned_at: now,
      created_at: now,
      updated_at: now,
    });
    return { id: result.insertedId.toString(), phone_number: twilioNumber.phoneNumber, twilio_sid: twilioSid, company_id: companyId, company_name: company.name, assigned_at: now, reused: true };
  }

  async listAvailableInventory() {
    const [twilioNumbers, assignments] = await Promise.all([
      getTwilioClient().incomingPhoneNumbers.list({ limit: 1000 }),
      getCollection(Collections.PHONE_ASSIGNMENTS).find({ status: 'assigned' }).toArray(),
    ]);
    const assignedSids = new Set(assignments.map((assignment) => assignment.twilio_sid));
    return twilioNumbers
      .filter((number) => !assignedSids.has(number.sid))
      .map((number) => ({ id: number.sid, phone_number: number.phoneNumber, twilio_sid: number.sid, status: 'available', assigned_at: null }));
  }
}

export const phoneNumbersService = new PhoneNumbersService();