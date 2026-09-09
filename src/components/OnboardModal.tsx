import { useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { X, User as UserIcon, Mail, Lock, Building2, Shield, Send } from 'lucide-react';
import { onboardUser } from '../api/users';
import type { User } from '../interface/users';
import toast from 'react-hot-toast';
import Spinner from './Spinner';

interface OnboardModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess?: () => void;
}

function OnboardModal({ isOpen, onClose, onSuccess }: OnboardModalProps) {
    const {
        register,
        handleSubmit,
        reset,
        formState: { errors, isSubmitting },
    } = useForm<User>({
        defaultValues: {
            email: '',
            full_name: '',
            password: '',
            agent_id: '',
            company_name: '',
            role: 'user',
            custom_sender_email: '',
        },
    });

    const modalRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
                onClose();
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen, onClose]);

    // Reset form when modal closes or opens
    useEffect(() => {
        if (!isOpen) {
            reset();
        }
    }, [isOpen, reset]);

    const onSubmit = async (data: User) => {
        try {
            await onboardUser(data);
            toast.success('User onboarded successfully!');
            if (onSuccess) onSuccess();
            onClose();
        } catch (err: any) {
            const detail = err?.response?.data?.detail || err;
            let errorMessage = 'Failed to onboard user. Please try again.';

            if (typeof detail === 'string') {
                errorMessage = detail;
            } else if (Array.isArray(detail)) {
                errorMessage = detail.map((d: any) => d.msg || d).join(', ');
            } else if (detail && typeof detail === 'object') {
                errorMessage = detail.message || detail.detail || JSON.stringify(detail);
            }

            toast.error(errorMessage);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm transition-all duration-300">
            <div
                ref={modalRef}
                className="bg-white w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300 border border-gray-100"
            >
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-linear-to-r from-cyan-50 to-white">
                    <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
                        <UserIcon className="w-5 h-5 text-cyan-600" />
                        Add New User
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-400 hover:text-gray-600 cursor-pointer"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Full Name */}
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium text-gray-700 flex justify-between">
                                <span>Full Name *</span>
                                {errors.full_name && <span className="text-xs text-red-500 font-normal">Required</span>}
                            </label>
                            <div className="relative">
                                <UserIcon className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors ${errors.full_name ? 'text-red-400' : 'text-gray-400'}`} />
                                <input
                                    {...register('full_name', { required: 'Full name is required' })}
                                    type="text"
                                    placeholder="John Doe"
                                    className={`w-full pl-10 pr-4 py-2.5 bg-gray-50 border rounded-xl focus:ring-2 outline-none transition-all placeholder:text-gray-400 ${errors.full_name
                                        ? 'border-red-300 focus:ring-red-500/10 focus:border-red-500'
                                        : 'border-gray-200 focus:ring-cyan-500/20 focus:border-cyan-500'
                                        }`}
                                />
                            </div>
                        </div>

                        {/* Email */}
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium text-gray-700 flex justify-between">
                                <span>Email Address *</span>
                                {errors.email && <span className="text-xs text-red-500 font-normal">Invalid email</span>}
                            </label>
                            <div className="relative">
                                <Mail className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors ${errors.email ? 'text-red-400' : 'text-gray-400'}`} />
                                <input
                                    {...register('email', {
                                        required: 'Email is required',
                                        pattern: {
                                            value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                                            message: "Invalid email address"
                                        }
                                    })}
                                    type="email"
                                    placeholder="john@example.com"
                                    className={`w-full pl-10 pr-4 py-2.5 bg-gray-50 border rounded-xl focus:ring-2 outline-none transition-all placeholder:text-gray-400 ${errors.email
                                        ? 'border-red-300 focus:ring-red-500/10 focus:border-red-500'
                                        : 'border-gray-200 focus:ring-cyan-500/20 focus:border-cyan-500'
                                        }`}
                                />
                            </div>
                        </div>

                        {/* Password */}
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium text-gray-700 flex justify-between">
                                <span>Password *</span>
                                {errors.password && <span className="text-xs text-red-500 font-normal">Min 6 chars</span>}
                            </label>
                            <div className="relative">
                                <Lock className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors ${errors.password ? 'text-red-400' : 'text-gray-400'}`} />
                                <input
                                    {...register('password', {
                                        required: 'Password is required',
                                        minLength: { value: 6, message: 'Password must be at least 6 characters' }
                                    })}
                                    type="password"
                                    placeholder="••••••••"
                                    className={`w-full pl-10 pr-4 py-2.5 bg-gray-50 border rounded-xl focus:ring-2 outline-none transition-all placeholder:text-gray-400 ${errors.password
                                        ? 'border-red-300 focus:ring-red-500/10 focus:border-red-500'
                                        : 'border-gray-200 focus:ring-cyan-500/20 focus:border-cyan-500'
                                        }`}
                                />
                            </div>
                        </div>

                        {/* Company Name */}
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium text-gray-700 flex justify-between">
                                <span>Company Name *</span>
                                {errors.company_name && <span className="text-xs text-red-500 font-normal">Required</span>}
                            </label>
                            <div className="relative">
                                <Building2 className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors ${errors.company_name ? 'text-red-400' : 'text-gray-400'}`} />
                                <input
                                    {...register('company_name', { required: 'Company name is required' })}
                                    type="text"
                                    placeholder="Acme Inc."
                                    className={`w-full pl-10 pr-4 py-2.5 bg-gray-50 border rounded-xl focus:ring-2 outline-none transition-all placeholder:text-gray-400 ${errors.company_name
                                        ? 'border-red-300 focus:ring-red-500/10 focus:border-red-500'
                                        : 'border-gray-200 focus:ring-cyan-500/20 focus:border-cyan-500'
                                        }`}
                                />
                            </div>
                        </div>

                        {/* Agent Name */}
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium text-gray-700">Agent ID</label>
                            <div className="relative">
                                <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <input
                                    {...register('agent_id')}
                                    type="text"
                                    placeholder="Agent Smith"
                                    className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 outline-none transition-all placeholder:text-gray-400"
                                />
                            </div>
                        </div>

                        {/* Role */}
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium text-gray-700">Role</label>
                            <div className="relative">
                                <Shield className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <select
                                    {...register('role')}
                                    className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 outline-none transition-all appearance-none"
                                >
                                    <option value="user">User</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Custom Sender Email */}
                    <div className="space-y-1.5">
                        <label className="text-sm font-medium text-gray-700">Custom Sender Email</label>
                        <div className="relative">
                            <Send className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                                {...register('custom_sender_email')}
                                type="email"
                                placeholder="noreply@yourcompany.com"
                                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 outline-none transition-all placeholder:text-gray-400"
                            />
                        </div>
                    </div>

                    {/* Footer/Submit */}
                    <div className="pt-4 flex gap-3">
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className={`flex-2 px-4 py-2.5 rounded-xl transition-all font-medium shadow-md disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer active:scale-95 min-h-[44px] ${
                                isSubmitting 
                                    ? 'bg-gray-200 shadow-none' 
                                    : 'bg-cyan-500 hover:bg-cyan-600 text-white shadow-cyan-500/20'
                            }`}
                        >
                            {isSubmitting ? (
                                <Spinner color="#000000" />
                            ) : (
                                'Onboard User'
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default OnboardModal;