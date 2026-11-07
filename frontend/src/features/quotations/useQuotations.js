import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { quotationsApi } from './quotationsApi';

export const useQuotations = (filters = {}) => useQuery({
    queryKey: ['quotations', filters],
    queryFn: () => quotationsApi.list(filters),
    placeholderData: (prev) => prev,
});

export const useQuotation = (id) => useQuery({
    queryKey: ['quotation', id],
    queryFn: () => quotationsApi.getById(id),
    enabled: !!id,
});

export const useCreateQuotation = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: quotationsApi.create,
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['quotations'] });
            toast.success('Quotation created successfully');
        },
        onError: (err) => toast.error(err.response?.data?.message || 'Failed to create quotation'),
    });
};

export const useUpdateQuotation = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ id, data }) => quotationsApi.update(id, data),
        onSuccess: (_, variables) => {
            qc.invalidateQueries({ queryKey: ['quotations'] });
            qc.invalidateQueries({ queryKey: ['quotation', variables.id] });
            toast.success('Quotation updated successfully');
        },
        onError: (err) => toast.error(err.response?.data?.message || 'Failed to update quotation'),
    });
};

export const useChangeQuotationStatus = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ id, status, reason }) => quotationsApi.changeStatus(id, status, reason),
        onSuccess: (_, variables) => {
            qc.invalidateQueries({ queryKey: ['quotations'] });
            qc.invalidateQueries({ queryKey: ['quotation', variables.id] });
            toast.success('Quotation status updated');
        },
        onError: (err) => toast.error(err.response?.data?.message || 'Failed to update status'),
    });
};

export const useConvertToInvoice = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ id, data }) => quotationsApi.convertToInvoice(id, data),
        onSuccess: (res, variables) => {
            qc.invalidateQueries({ queryKey: ['quotations'] });
            qc.invalidateQueries({ queryKey: ['quotation', variables.id] });
            qc.invalidateQueries({ queryKey: ['invoices'] });
            qc.invalidateQueries({ queryKey: ['invoicesAging'] });
            qc.invalidateQueries({ queryKey: ['customers'] });
            toast.success(res?.message || 'Quotation converted to invoice');
        },
        onError: (err) => toast.error(err.response?.data?.message || 'Failed to convert quotation to invoice'),
    });
};

export const useDeleteQuotation = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: quotationsApi.delete,
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['quotations'] });
            toast.success('Quotation deleted successfully');
        },
        onError: (err) => toast.error(err.response?.data?.message || 'Failed to delete quotation'),
    });
};

