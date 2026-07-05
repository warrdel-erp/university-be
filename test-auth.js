import axios from 'axios';
const login = async () => {
    try {
        const res = await axios.post('http://localhost:8080/auth/login', { username: 'admin', password: 'password' }); // Replace with correct login if needed, or I can bypass token check in middleware for a second
    } catch (e) {
        console.error(e.message);
    }
}
