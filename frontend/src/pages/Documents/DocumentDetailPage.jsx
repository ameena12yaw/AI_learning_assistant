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
import Flashcard from '../../Components/flashcard/Flashcard.jsx'
import FlashcardManager from '../../Components/flashcard/FlashcardManager.jsx'
import QuizManager from '../../Components/quizzes/QuizManager.jsx'
import { isPdfFile, isWordFile } from '../../utils/documentTypes.js'
import { API_BASE_URL } from '../../utils/apiConfig.js'


const DocumentDetailPage = () => {

  const { id } = useParams();
  const [document, setDocument] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('content');


  useEffect(() => {
    const fetchDocumentDetails = async () => {
      setLoading(true);
      try {
        const data = await documentService.getDocumentById(id);
        setDocument(data);

      } catch (error) {
        toast.error(error.message || "Failed to fetch document details");
      } finally {
        setLoading(false);
      }
    };

    fetchDocumentDetails();
  }, [id]);


  const getFileUrl = () => {
    const filePath = document?.data?.filepath;
    if (!filePath) {
      return null;
    }

    if (filePath.startsWith('http://') || filePath.startsWith('https://')) {
      return filePath;
    }

    // Legacy documents stored on the API server disk
    const baseUrl = API_BASE_URL;
    if (!baseUrl) return null;
    return `${baseUrl}/${filePath.startsWith('/') ? filePath.slice(1) : filePath}`;
  };

  const renderContent = () => {
    if (!document?.data?.filepath) {
      return <p className="text-center text-slate-600">Document not available</p>;
    }

    const fileUrl = getFileUrl();
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

    if (isWordFile(filename)) {
      return (
        <div className='bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-600 rounded-lg shadow-sm h-full min-h-0 flex flex-col overflow-hidden'>
          <div className="flex items-center justify-between gap-3 p-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-800/80 flex-shrink-0">
            <a
              href={fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 font-medium"
            >
              <ExternalLink className="h-4 w-4" />
              Download Word file
            </a>
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
        <div className='bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-600 rounded-lg shadow-sm h-full min-h-0 flex flex-col overflow-hidden'>
          <div className="flex items-center justify-between gap-3 p-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-800/80 flex-shrink-0">
            <a
              href={fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 font-medium"
            >
              <ExternalLink className="h-4 w-4" />
              Open PDF in new tab
            </a>
          </div>
          <div className="flex-1 min-h-0 flex flex-col p-4 bg-slate-50 dark:bg-slate-800">
            <div className="flex-1 min-h-0 rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden shadow-inner bg-white dark:bg-slate-900">
              <iframe
                src={fileUrl}
                title="Document PDF"
                className="w-full h-full border-0"
              ></iframe>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="flex items-center justify-center h-full min-h-[300px]">
        <a
          href={fileUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 font-medium"
        >
          <ExternalLink className="h-4 w-4" />
          Download file
        </a>
      </div>
    );
  };

  const renderChat = () => {
    return (
      <div className="bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-600 rounded-lg h-full min-h-0 overflow-hidden p-4 flex">
        <ChatInterface />
      </div>
    );
  };

  const renderAIAction = () => {
    return (
      <AiAction />
    );
  };

  const renderFlashcardTab = () => {
    return (
      <FlashcardManager documentId={id} />
    );
  };

  const renderQuizTab = () => {
    return (
      <QuizManager documentId={id} />
    );
  };

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

  const activeTabData = tabs.find(tab => tab.key === activeTab);

  return (
    <div className="flex flex-col flex-1 min-h-0 h-full overflow-hidden gap-4">
      <Link to='/documents' className="inline-flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400 hover:text-emerald-500 dark:hover:text-emerald-300 font-medium mb-4">
        <ArrowLeft className="h-4 w-4" />
        Back to Documents
      </Link>
      <PageHeader 
        title={document.data.title || "Document Details"} 
        description={document.data.description || "View document details and interact with the content."} 
      />
      <div className="flex-shrink-0">
        <Tabs
          tabs={tabs}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
        />
      </div>
      <div className="mt-2 flex-1 min-h-0 overflow-hidden">
        {activeTabData && activeTabData.render()}
      </div>
    </div>
  );
}

export default DocumentDetailPage