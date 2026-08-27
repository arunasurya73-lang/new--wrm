import axios from 'axios'

const api = axios.create({
  baseURL: 'https://new-wrm-1.onrender.com',
  timeout: 60000,
})

export default api
