import { useNavigate } from 'react-router-dom';

export default function App() {
	const navigate = useNavigate();

	const handleVideoNavigation = () => {
		navigate('/conference?name=Stylz&room=Demo');
	};
	return (
		<div>
			<button onClick={handleVideoNavigation}>Create Video Conference</button>
		</div>
	);
}
