import axios from 'axios'
export const API_URL = 'http://127.0.0.1:3000'
//import.meta.env.VITE_API_URL


export const api = axios.create({
	baseURL: API_URL,
	withCredentials: true,
})

export const getEntities = (entityName) => api.get(entityName)
export const getEntity = (entityName, id) => api.get(`${entityName}/${id}`)
export const deleteEntity = (entityName, id) => api.delete(`${entityName}/${id}`)
export const addEntity = (entityName, entity) => api.post(`${entityName}`, entity)
export const updateEntity = (entityName, id, entity) => api.put(`${entityName}/${id}`, entity)
