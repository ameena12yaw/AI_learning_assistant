import axiosInstance from "../utils/axioInstance";
import { API_PATHS } from "../utils/apiPaths";

const formatError = async (error) => {
	let msg = error?.response?.data?.error || error?.message || 'Request failed';
	const status = error?.response?.status;
	const data = error?.response?.data;

	if (data instanceof Blob) {
		try {
			const text = await data.text();
			const parsed = JSON.parse(text);
			msg = parsed.error || msg;
		} catch {
			// keep default message
		}
	}

	const err = new Error(msg);
	if (status) err.status = status;
	return err;
};

const uploadDocument = async (formData) => {
	try {
		const res = await axiosInstance.post(API_PATHS.DOCUMENTS.UPLOAD, formData, {
			headers: { "Content-Type": "multipart/form-data" },
		});
		return res.data;
	} catch (error) {
		throw await formatError(error);
	}
};

const getDocuments = async () => {
	try {
		const res = await axiosInstance.get(API_PATHS.DOCUMENTS.GET_DOCUMENTS);
		return res.data;
	} catch (error) {
		throw await formatError(error);
	}
};

const getDocumentById = async (id) => {
	try {
		const res = await axiosInstance.get(API_PATHS.DOCUMENTS.GET_DOCUMENT_BY_ID(id));
		return res.data;
	} catch (error) {
		throw await formatError(error);
	}
};

const getDocumentFile = async (id) => {
	try {
		const res = await axiosInstance.get(API_PATHS.DOCUMENTS.GET_DOCUMENT_FILE(id), {
			responseType: 'blob',
		});
		return res.data;
	} catch (error) {
		throw await formatError(error);
	}
};


const deleteDocument = async (id) => {
	try {
		const res = await axiosInstance.delete(API_PATHS.DOCUMENTS.DELETE_DOCUMENT(id));
		return res.data;
	} catch (error) {
		throw await formatError(error);
	}
};

const documentService = {
	uploadDocument,
	getDocuments,
	getDocumentById,
	getDocumentFile,
	deleteDocument,
};

export default documentService;
