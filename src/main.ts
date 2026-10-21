import { mount } from 'svelte';
import './app.css';
import App from './App.svelte';
import { hass } from './lib/ha/hass.svelte';
import { start } from './lib/ha/live';

if (!hass.demo) start();

const app = mount(App, { target: document.getElementById('app')! });

export default app;
