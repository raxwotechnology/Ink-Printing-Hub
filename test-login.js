import axios from 'axios';

const PORT = process.env.PORT || 5005;

const testLogin = async () => {
    try {
        const response = await axios.post(`http://localhost:${PORT}/api/auth/login`, {
            email: 'admin@admin.com',
            password: 'password123'
        });
        console.log('Login successful:', response.data);
    } catch (error) {
        if (error.response) {
            console.log('Login failed:', error.response.status, error.response.data);
        } else {
            console.log('Error:', error.message);
        }
    }
};

testLogin();
