import axiosInstance from './axiosConfig'; 
// or just `import axios from 'axios'` if you don't use a custom axios config.

export const getMembers = async () => {
  // If your Laravel route is /members, do:
  const response = await axiosInstance.get('/members');
  return response.data; // e.g. [{ MemberID: 1, FullName: 'John Doe' }, ...]
};
