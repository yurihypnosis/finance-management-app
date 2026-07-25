import './ScreenHeader.css';

export interface ScreenHeaderProps {
  title: string;
  sub?: string;
  onBack?: () => void;
  action?: { label: string; onClick: () => void };
}

export function ScreenHeader({ title, sub, onBack, action }: ScreenHeaderProps) {
  return (
    <div className="screen-header">
      <div className="screen-header__main">
        {onBack && (
          <button className="screen-header__back" onClick={onBack} aria-label="戻る">
            ‹
          </button>
        )}
        <div className="screen-header__content">
          <div className="screen-header__title">{title}</div>
          {sub && <div className="screen-header__sub">{sub}</div>}
        </div>
        {action && (
          <button className="screen-header__action" onClick={action.onClick}>
            {action.label}
          </button>
        )}
      </div>
    </div>
  );
}
