import React from 'react';
import { useNavigate } from 'react-router-dom';
import './App.css';
const newModule = {
	plugins: {},
	test: (name, val) => {
		console.log({ name, val });
	},

	register: function (plugin: any) {
		const { name, exec } = plugin;
		(this as any).plugins[name] = exec;
		console.log('registered', plugin);
	},

	send: function (name, val) {
		const func = (this as any)?.plugins?.[name];
		console.log('sending..', func(name, val));
	}
};

const plugin = {
	name: 'superPlugin',
	exec: function (a, b) {
		console.log({ a, b });
		return 'coolest plugin alive!';
	}
};

newModule.register(plugin);
newModule.send('superPlugin', '17');
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
