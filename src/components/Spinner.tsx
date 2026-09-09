import "./Spinner.css";

interface SpinnerProps {
  color?: string;
}

const Spinner = ({ color = "hsl(214, 97%, 59%)" }: SpinnerProps) => {
  return (
    <div className="spinner" style={{ "--spinner-color": color } as React.CSSProperties} role="status" aria-label="Loading">
      <svg viewBox="25 25 50 50" aria-hidden="true">
        <circle r="20" cy="50" cx="50" />
      </svg>
    </div>
  );
};

export default Spinner;
