import InputBlock from "../../../components/ui/Labels/InputBlock";

interface LabelSearcherProps {
	value: string;
	onChange: (value: string) => void;
}

export function LabelSearcher({ value, onChange }: LabelSearcherProps) {
	return (
		<InputBlock
			label="Label Search"
			prefix={<span className="ico-search"></span>}
			inputProps={{
				type: "text",
				id: "search-input",
				placeholder: "Search label",
				name: "search",
				value,
				onChange: (e) => onChange(e.target.value),
			}}
			suffix={
				<button id="search-button" type="submit">
					<i className="fa fa-search"></i>
				</button>
			}
		/>
	);
}
