import { Link, type To } from 'react-router-dom';

type InternalLinkProps = {
  to: To;
  children: React.ReactNode;
  className?: string;
};

export const InternalLink = ({ to, children, className = '' }: InternalLinkProps) => (
  <Link
    to={to}
    className={`inline-flex items-center gap-1 text-xs font-medium transition-colors duration-150 ${className}`}
    style={{ color: '#347ed3' }}
    onMouseEnter={(e) => {
      e.currentTarget.style.color = '#1a5bb8';
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.color = '#347ed3';
    }}
  >
    {children}
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="shrink-0">
      <path
        d="M5.25 3.5L8.75 7L5.25 10.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  </Link>
);
