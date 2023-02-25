// eslint-disable-next-line @typescript-eslint/no-unused-vars
import adapter from 'webrtc-adapter';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Producer from './stream/Producer';
import Consumer from './stream/Consumer';
import Conference from './conference/Conference';
import App from './App';

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);

root.render(
	<BrowserRouter>
		<Routes>
			<Route
				index
				path='/'
				element={<App />}
			/>
			<Route
				path='/conference'
				element={<Conference />}
			/>
			<Route
				path='/stream'
				element={<Producer />}
			/>
			<Route
				path='/watch'
				element={<Consumer />}
			/>
		</Routes>
	</BrowserRouter>
);
