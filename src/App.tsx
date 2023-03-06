import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function App() {
	const navigate = useNavigate();

	const handleConfsNavigation = () => {
		navigate('/conference?name=Stylz&room=Demo');
	};

	return (
		<div>
			<button onClick={handleConfsNavigation}>
				Create Video Conference</button>
		</div>
	);
}
