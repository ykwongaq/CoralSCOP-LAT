import { useEffect, useRef, useState } from "react";
import styles from "./SideBar.module.css";

interface SideBarDropDownListProps {
  id: string;
  icon: string;
  label: string;
  children: React.ReactNode;
}

export default function SideBarDropDownList({
  id,
  icon,
  label,
  children,
}: SideBarDropDownListProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLLIElement>(null);

  const handleToggle = () => {
    setIsOpen((prev) => !prev);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <li className={styles.navListItem} ref={containerRef}>
      <button id={id} className={styles.navListButton} onClick={handleToggle}>
        <span className={icon}></span>
        <span className={styles.arrowTooltip}>{label}</span>
      </button>
      {isOpen && (
        <div id={`file-dropdown-menu-${id}`} className={styles.normalDropdown}>
          {children}
        </div>
      )}
    </li>
  );
}
