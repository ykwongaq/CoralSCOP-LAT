import styles from "./SettingGroups.module.css";

export default function SettingGroups({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className={styles.settingsGroup}>{children}</div>;
}
