import { BrowserRouter, Routes, Route } from "react-router-dom";
import "./assets/icon/style.css";
import "./App.css";

import {
	EntryPage,
	ProjectCreationPage,
	ProjectAnnotationPage,
	ProjectQuickStartPage,
} from "./pages/";
import { PopMessageProvider } from "./components/ui";

function App() {
	return (
		<PopMessageProvider>
			<BrowserRouter>
				<Routes>
					<Route path="/" element={<EntryPage />} />
					<Route path="/project-creation" element={<ProjectCreationPage />} />
					<Route
						path="/project-annotation"
						element={<ProjectAnnotationPage />}
					/>
					<Route
						path="/project-quick-start"
						element={<ProjectQuickStartPage />}
					/>
				</Routes>
			</BrowserRouter>
		</PopMessageProvider>
	);
}

export default App;
