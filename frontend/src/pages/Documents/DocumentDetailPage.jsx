import React, { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import documentService from '../../services/documentService.js'
import Spinner from '../../Components/common/Spinner.jsx'
import toast from 'react-hot-toast'
import { ArrowLeft, ExternalLink } from 'lucide-react'
import PageHeader from '../../Components/common/PageHeader.jsx'
import Tabs from '../../Components/common/Tabs.jsx'
import ChatInterface from '../../Components/chat/ChatInterface.jsx'
import AiAction from '../../Components/ai/AiAction.jsx'
import FlashcardManager from '../../Components/flashcard/FlashcardManager.jsx'
import QuizManager from '../../Components/quizzes/QuizManager.jsx'
import { isPdfFile, isWordFile } from '../../utils/documentTypes.js'

const isLegacyLocalDocument = (data) => {
  const filepath = data?.filepath || '';
  const storedFilename = data?.storedFilename || '';

  if (storedFilename.includes('/') && !storedFilename.startsWith('http')) {
    return false;
  }

  return filepath.includes('localhost') || filepath.includes('/uploads/documents/');
};

const DocumentDetailPage = () => {
  const { id } = useParams();
  const [document, setDocument] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('content');
  const [fileBlobUrl, setFileBlobUrl] = useState(null);
  const [fileLoading, setFileLoading] = useState(false);
  const [fileError, setFileError] = useState(null);

  useEffect(() => {
    const fetchDocumentDetails = async () => {
      setLoading(true);
      try {
        const data = await documentService.getDocumentById(id);
        setDocument(data);
      } catch (error) {
        toast.error(error.message || 'Failed to fetch document details');
      } finally {
        setLoading(false);
      }
    };

    fetchDocumentDetails();
  }, [id]);

  useEffect(() => {
    const docData = document?.data;
    if (!id || !docData || docData.status !== 'ready' || isLegacyLocalDocument(docData)) {
      setFileBlobUrl(null);
      setFileError(null);
      return undefined;
    }

    let objectUrl;

    const loadDocumentFile = async () => {
      setFileLoading(true);
      setFileError(null);

      try {
        const blob = await documentService.getDocumentFile(id);
        objectUrl = URL.createObjectURL(blob);
        setFileBlobUrl(objectUrl);
      } catch (error) {
        setFileBlobUrl(null);
        setFileError(error.message || 'Failed to load document file');
      } finally {
        setFileLoading(false);
      }
    };

    loadDocumentFile();

    return () => {
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [id, document?.data?.status, document?.data?.filepath, document?.data?.storedFilename]);

  const handleDownload = () => {
    if (!fileBlobUrl) return;

    const link = window.document.createElement('a');
    link.href = fileBlobUrl;
    link.download = document?.data?.filename || 'document';
    link.click();
  };

  const renderContent = () => {
    if (!document?.data?.filepath) {
      return <p className="text-center text-slate-600">Document not available</p>;
    }

    const filename = document.data.filename || '';
    const extractedText = document.data.extractedText || '';
    const status = document.data.status;

    if (status === 'processing') {
      return (
        <div className="flex items-center justify-center h-full min-h-[300px]">
          <p className="text-slate-600">Processing document...</p>
        </div>
      );
    }

    if (status === 'failed') {
      return (
        <div className="flex items-center justify-center h-full min-h-[300px]">
          <p className="text-red-600">Failed to process document. Try uploading again.</p>
        </div>
      );
    }

    if (isLegacyLocalDocument(document.data)) {
      return (
        <div className="flex flex-col items-center justify-center h-full min-h-[300px] gap-3 px-6 text-center">
          <p className="text-red-600 font-medium">This file was saved locally and is no longer available online.</p>
          <p className="text-slate-600 text-sm">Delete this document and upload it again so it is stored in Supabase.</p>
        </div>
      );
    }

    if (fileLoading) {
      return (
        <div className="flex items-center justify-center h-full min-h-[300px]">
          <p className="text-slate-600">Loading document file...</p>
        </div>
      );
    }

    if (fileError) {
      return (
        <div className="flex flex-col items-center justify-center h-full min-h-[300px] gap-3 px-6 text-center">
          <p className="text-red-600 font-medium">{fileError}</p>
          <p className="text-slate-600 text-sm">Delete this document and upload it again.</p>
        </div>
      );
    }

    if (!fileBlobUrl) {
      return (
        <div className="flex items-center justify-center h-full min-h-[300px]">
          <p className="text-slate-600">Document file is not available. Try uploading again.</p>
        </div>
      );
    }

    if (isWordFile(filename)) {
      return (
        <div className="bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-600 rounded-lg shadow-sm h-full min-h-0 flex flex-col overflow-hidden">
          <div className="flex items-center justify-between gap-3 p-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-800/80 flex-shrink-0">
            <button
              type="button"
              onClick={handleDownload}
              className="inline-flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 font-medium"
            >
              <ExternalLink className="h-4 w-4" />
              Download Word file
            </button>
          </div>
          <div className="flex-1 min-h-0 overflow-auto p-6 bg-white dark:bg-slate-900">
            {extractedText ? (
              <div className="prose prose-slate dark:prose-invert max-w-none whitespace-pre-wrap text-sm leading-relaxed text-slate-800 dark:text-slate-200">
                {extractedText}
              </div>
            ) : (
              <p className="text-center text-slate-600">No text could be extracted from this document.</p>
            )}
          </div>
        </div>
      );
    }

    if (isPdfFile(filename)) {
      return (
        <div className="bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-600 rounded-lg shadow-sm h-full min-h-0 flex flex-col overflow-hidden">
          <div className="flex items-center justify-between gap-3 p-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-800/80 flex-shrink-0">
            <button
              type="button"
              onClick={handleDownload}
              className="inline-flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 font-medium"
            >
              <ExternalLink className="h-4 w-4" />
              Download PDF
            </button>
          </div>
          <div className="flex-1 min-h-0 flex flex-col p-4 bg-slate-50 dark:bg-slate-800">
            <div className="flex-1 min-h-0 rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden shadow-inner bg-white dark:bg-slate-900">
              <iframe src={fileBlobUrl} title="Document PDF" className="w-full h-full border-0" />
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="flex items-center justify-center h-full min-h-[300px]">
        <button
          type="button"
          onClick={handleDownload}
          className="inline-flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 font-medium"
        >
          <ExternalLink className="h-4 w-4" />
          Download file
        </button>
      </div>
    );
  };

  const renderChat = () => (
    <div className="bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-600 rounded-lg h-full min-h-0 overflow-hidden p-4 flex">
      <ChatInterface />
    </div>
  );

  const renderAIAction = () => <AiAction />;

  const renderFlashcardTab = () => <FlashcardManager documentId={id} />;

  const renderQuizTab = () => <QuizManager documentId={id} />;

  const tabs = [
    { label: 'Content', key: 'content', render: renderContent },
    { label: 'Chat', key: 'chat', render: renderChat },
    { label: 'AI Actions', key: 'ai-actions', render: renderAIAction },
    { label: 'Flashcards', key: 'flashcards', render: renderFlashcardTab },
    { label: 'Quiz', key: 'quiz', render: renderQuizTab },
  ];

  if (loading) {
    return <Spinner />;
  }

  if (!document) {
    return <p className="text-center text-slate-600">Document not found</p>;
  }

  const activeTabData = tabs.find((tab) => tab.key === activeTab);

  return (
    <div className="flex flex-col flex-1 min-h-0 h-full overflow-hidden gap-4">
      <Link
        to="/documents"
        className="inline-flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400 hover:text-emerald-500 dark:hover:text-emerald-300 font-medium mb-4"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Documents
      </Link>
      <PageHeader
        title={document.data.title || 'Document Details'}
        description={document.data.description || 'View document details and interact with the content.'}
      />
      <div className="flex-shrink-0">
        <Tabs tabs={tabs} activeTab={activeTab} setActiveTab={setActiveTab} />
      </div>
      <div className="mt-2 flex-1 min-h-0 overflow-hidden">{activeTabData && activeTabData.render()}</div>
    </div>
  );
};

export default DocumentDetailPage;
