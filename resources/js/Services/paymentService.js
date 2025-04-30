import axiosInstance from './axiosConfig';

/**
 * Fetch all payments (GET /payments)
 */
export const getPayments = async () => {
  const response = await axiosInstance.get('/payments');
  return response.data;
};

/**
 * Create a new payment (POST /payments)
 */
export const createPayment = async (payload) => {
  const response = await axiosInstance.post('/payments', payload);
  return response.data; // or response if needed
};

/**
 * Update an existing payment (PUT /payments/{id})
 */
export const updatePayment = async (paymentId, payload) => {
  const response = await axiosInstance.put(`/payments/${paymentId}`, payload);
  return response.data;
};

/**
 * Delete a payment (DELETE /payments/{id})
 */
export const deletePayment = async (paymentId) => {
  const response = await axiosInstance.delete(`/payments/${paymentId}`);
  return response.data;
};

/**
 * Initiate refund (POST /payments/{paymentId}/refund/initiate)
 */
export const initiateRefund = async (paymentId) => {
  const response = await axiosInstance.post(`/payments/${paymentId}/refund/initiate`);
  return response.data;
};

/**
 * Approve refund (POST /payments/{paymentId}/refund/approve)
 */
export const approveRefund = async (paymentId) => {
  const response = await axiosInstance.post(`/payments/${paymentId}/refund/approve`);
  return response.data;
};
