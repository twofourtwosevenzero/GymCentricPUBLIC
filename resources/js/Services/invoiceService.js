import axiosInstance from './axiosConfig';

/**
 * Fetch all invoices (GET /invoices)
 */
export const getInvoices = async () => {
  // If your route is /invoices, do:
  const response = await axiosInstance.get('/invoices');
  return response.data;
};

/**
 * Create invoice (POST /invoices)
 */
export const createInvoice = async (payload) => {
  const response = await axiosInstance.post('/invoices', payload);
  return response.data;
};

/**
 * Update invoice (PUT /invoices/{id})
 */
export const updateInvoice = async (invoiceId, payload) => {
  const response = await axiosInstance.put(`/invoices/${invoiceId}`, payload);
  return response.data;
};

/**
 * Delete invoice (DELETE /invoices/{id})
 */
export const deleteInvoice = async (invoiceId) => {
  const response = await axiosInstance.delete(`/invoices/${invoiceId}`);
  return response.data;
};
