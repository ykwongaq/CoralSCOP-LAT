import styles from "./SideBar.module.css";

interface SideBarDropDownButtonProps {
  id: string;
  label: string;
  onClick: () => void;
}

export default function SideBarDropDownButton({
  id,
  label,
  onClick,
}: SideBarDropDownButtonProps) {
  return (
    <button id={id} className={styles.normalDropdownLink} onClick={onClick}>
      {label}
    </button>
  );
}
