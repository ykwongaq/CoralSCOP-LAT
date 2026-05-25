import styles from "./SideBar.module.css";

interface SideBarButtonProps {
  id: string;
  icon: string;
  label: string;
  onClick: () => void;
  isActive?: boolean;
  disabled?: boolean;
}

export default function SideBarButton({
  id,
  icon,
  label,
  onClick,
  isActive = false,
  disabled = false,
}: SideBarButtonProps) {
  return (
    <li className={styles.navListItem}>
      <button
        id={id}
        className={`${styles.navListButton} ${isActive ? styles.active : ""}`}
        onClick={onClick}
        aria-label={label}
        aria-pressed={isActive}
        disabled={disabled}
      >
        <span className={icon}></span>
        <span className={styles.arrowTooltip}>{label}</span>
      </button>
    </li>
  );
}
