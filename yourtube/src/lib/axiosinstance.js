import axios from "axios";

const backendUrl =
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  process.env.BACKEND_URL ||
  "http://localhost:5000";

const axiosInstance = axios.create({
  baseURL: backendUrl,
  timeout: 10000,
});

axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.code === "ERR_NETWORK" || !error.response) {
      console.warn("Backend server is unreachable on " + backendUrl);
    }
    return Promise.reject(error);
  }
);

export default axiosInstance;

