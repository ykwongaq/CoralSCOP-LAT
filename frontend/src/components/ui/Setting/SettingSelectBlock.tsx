import sharedStyles from "./Settings.module.css";
import styles from "./SettingSelectBlock.module.css";

interface SettingSelectBlockProps {
  title: string;
  description: string;
  id: string;
  options: { label: string; value: string | null }[];
  value?: string | null;
  onChange?: (value: string | null) => void;
}

export default function SettingSelectBlock({
  title,
  description,
  id,
  options,
  value,
  onChange,
}: SettingSelectBlockProps) {
  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    onChange?.(val === "" ? null : val);
  };

  return (
    <div className={sharedStyles.settingItem} id={id}>
      <label className={sharedStyles.settingItemTitle} htmlFor={`${id}-select`}>
        {title}
      </label>
      <p className={sharedStyles.settingItemDesc}>{description}</p>
      <div className={styles.selectBlk}>
        <select
          id={`${id}-select`}
          value={value ?? ""}
          onChange={handleChange}
        >
          {options.map((opt) => (
            <option key={opt.value ?? "__null__"} value={opt.value ?? ""}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
