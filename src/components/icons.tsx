import type { CSSProperties } from 'react';

const base: CSSProperties = { display: 'block' };

function Svg({ children, size = 20 }: { children: React.ReactNode; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" style={base}>
      {children}
    </svg>
  );
}

export function HomeIcon(props: { size?: number }) {
  return <Svg {...props}><path d="M3 11.5 12 4l9 7.5" /><path d="M5.5 10v9a1 1 0 0 0 1 1H9a1 1 0 0 0 1-1v-4a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v4a1 1 0 0 0 1 1h2.5a1 1 0 0 0 1-1v-9" /></Svg>;
}
export function ExpenseIcon(props: { size?: number }) {
  return <Svg {...props}><path d="M6 3.5h9l3 3V20a.5.5 0 0 1-.5.5h-12A.5.5 0 0 1 5 20V4a.5.5 0 0 1 1-.5Z" /><path d="M9 9h6M9 12.5h6M9 16h4" /></Svg>;
}
export function BudgetIcon(props: { size?: number }) {
  return <Svg {...props}><circle cx="12" cy="12" r="8.5" /><path d="M12 6.5V12l4 2.3" /></Svg>;
}
export function ReportIcon(props: { size?: number }) {
  return <Svg {...props}><path d="M4 20V10M10 20V4M16 20v-7M4 20h16" /></Svg>;
}
export function MoreIcon(props: { size?: number }) {
  return <Svg {...props}><circle cx="6" cy="12" r="1.3" fill="currentColor" stroke="none" /><circle cx="12" cy="12" r="1.3" fill="currentColor" stroke="none" /><circle cx="18" cy="12" r="1.3" fill="currentColor" stroke="none" /></Svg>;
}
