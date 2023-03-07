import axios, { AxiosResponse, AxiosRequestConfig, InternalAxiosRequestConfig } from 'axios';

const service = axios.create();

// Request interceptors
service.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
        // do something
        return config;
    },
    (error: any) => {
        Promise.reject(error);
    }
);

// Response interceptors
service.interceptors.response.use(
    async (response: AxiosResponse): Promise<any> => {
        // do something
    },
    (error: any) => {
        // do something
        return Promise.reject(error);
    }
);

export default service;
