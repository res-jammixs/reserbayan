'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, Save } from 'lucide-react';
import Link from 'next/link';
import NotificationModal from '@/shared/components/modals/NotificationModal';

export default function EditDocumentPage({ basePath = '/admin' }) {
  const router = useRouter();
  const params = useParams();
  const id = params.id;

  const [formData, setFormData] = useState({
    name: '',
    shortDescription: '',
    imagePath: '',
    details: {
      category: '',
      longDescription: '',
      processingTime: '',
      pdfPath: '',
      requirements: [],
      uses: []
    }
  });
  const [generatedId, setGeneratedId] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(true);
  const [requirementsText, setRequirementsText] = useState('');
  const [usesText, setUsesText] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [pdfFile, setPdfFile] = useState(null);
  const [notification, setNotification] = useState(null);

  const uploadFile = async (file) => {
    if (!file) return null;

    const formData = new FormData();
    formData.append('file', file);

    const token = localStorage.getItem('token');
    const response = await fetch('/api/document-types/upload', {
      method: 'POST',
      body: formData,
      ...(token ? { headers: { 'Authorization': `Bearer ${token}` } } : {})
    });

    if (!response.ok) throw new Error('Failed to upload file');
    return await response.text();
  };

  const fetchDocument = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/document-types/${id}`, {
        headers: token ? {
          'Authorization': `Bearer ${token}`,
        } : {},
      });
      if (!response.ok) throw new Error('Failed to fetch document');
      const data = await response.json();

      setFormData({
        name: data.name || '',
        shortDescription: data.shortDescription || '',
        imagePath: data.imagePath || '',
        details: {
          category: data.details?.category || '',
          longDescription: data.details?.longDescription || '',
          processingTime: data.details?.processingTime || '',
          pdfPath: data.details?.pdfPath || '',
          requirements: data.details?.requirements || [],
          uses: data.details?.uses || []
        }
      });
      const initialSlug = (data.name || '')
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-');
      setGeneratedId(initialSlug);

      setRequirementsText((data.details?.requirements || []).join('\n'));
      setUsesText((data.details?.uses || []).join('\n'));
    } catch (err) {
      setNotification({
        type: 'error',
        title: 'Document Load Failed',
        message: 'Error fetching document: ' + err.message,
        autoClose: true,
      });
      setTimeout(() => router.push(`${basePath}/documents`), 1200);
    } finally {
      setFetchLoading(false);
    }
  }, [basePath, id, router]);

  useEffect(() => {
    fetchDocument();
  }, [fetchDocument]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Upload files first
      let imagePath = formData.imagePath;
      let pdfPath = formData.details.pdfPath;

      if (imageFile) {
        imagePath = await uploadFile(imageFile);
      }

      if (pdfFile) {
        pdfPath = await uploadFile(pdfFile);
      }

      const token = localStorage.getItem('token');

      // Parse requirements and uses
      const requirements = requirementsText.split('\n').filter(item => item.trim());
      const uses = usesText.split('\n').filter(item => item.trim());

      const submitData = {
        ...formData,
        id: generatedId,
        imagePath,
        details: {
          ...formData.details,
          pdfPath,
          requirements,
          uses
        }
      };

      const response = await fetch(`/api/document-types/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify(submitData)
      });

      if (!response.ok) throw new Error('Failed to update document type');

      router.push(`${basePath}/documents`);
    } catch (err) {
      setNotification({
        type: 'error',
        title: 'Document Update Failed',
        message: 'Error updating document type: ' + err.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name.startsWith('details.')) {
      const detailField = name.split('.')[1];
      setFormData(prev => ({
        ...prev,
        details: {
          ...prev.details,
          [detailField]: value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
      if (name === 'name') {
        const slug = value
          .toLowerCase()
          .trim()
          .replace(/[^a-z0-9\s-]/g, '')
          .replace(/\s+/g, '-')
          .replace(/-+/g, '-');
        setGeneratedId(slug);
      }
    }
  };

  if (fetchLoading) {
    return (
      <div className="pt-24 px-8 min-h-screen bg-[#FAFAFA] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#243b8e] mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading document...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="pt-24 px-8 min-h-screen bg-[#FAFAFA]">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex items-center gap-4">
          <Link
            href={`${basePath}/documents`}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <ArrowLeft size={24} />
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">Edit Document Type</h1>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm p-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Basic Info */}
            <div className="md:col-span-2">
              <h2 className="text-xl font-semibold mb-4">Basic Information</h2>
            </div>

            {/* Auto-generated ID preview */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Document ID (auto-generated)
              </label>
              <input
                type="text"
                value={generatedId}
                disabled
                className="w-full px-3 py-2 border border-gray-200 bg-gray-50 rounded-lg"
                placeholder="Generated from name"
              />
              <p className="mt-1 text-xs text-gray-500">Based on the Name field.</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Name *
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2f84c0]"
                placeholder="e.g., Barangay Clearance"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Short Description *
              </label>
              <input
                type="text"
                name="shortDescription"
                value={formData.shortDescription}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2f84c0]"
                placeholder="Brief description of the document"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Image File (leave empty to keep current)
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setImageFile(e.target.files[0])}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2f84c0]"
              />
              {imageFile && <p className="mt-1 text-sm text-gray-600">Selected: {imageFile.name}</p>}
              {!imageFile && formData.imagePath && <p className="mt-1 text-sm text-gray-600">Current: {formData.imagePath}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Category
              </label>
              <input
                type="text"
                name="details.category"
                value={formData.details.category}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2f84c0]"
                placeholder="e.g., Certificate"
              />
            </div>

            {/* Details */}
            <div className="md:col-span-2">
              <h2 className="text-xl font-semibold mb-4">Additional Details</h2>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Long Description
              </label>
              <textarea
                name="details.longDescription"
                value={formData.details.longDescription}
                onChange={handleChange}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2f84c0]"
                placeholder="Detailed description of the document"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Processing Time
              </label>
              <input
                type="text"
                name="details.processingTime"
                value={formData.details.processingTime}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2f84c0]"
                placeholder="e.g., 3-5 working days"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                PDF File (leave empty to keep current)
              </label>
              <input
                type="file"
                accept=".pdf"
                onChange={(e) => setPdfFile(e.target.files[0])}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2f84c0]"
              />
              {pdfFile && <p className="mt-1 text-sm text-gray-600">Selected: {pdfFile.name}</p>}
              {!pdfFile && formData.details.pdfPath && <p className="mt-1 text-sm text-gray-600">Current: {formData.details.pdfPath}</p>}
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Requirements (one per line)
              </label>
              <textarea
                value={requirementsText}
                onChange={(e) => setRequirementsText(e.target.value)}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2f84c0]"
                placeholder="Valid ID&#10;Proof of residency&#10;Birth certificate"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Uses (one per line)
              </label>
              <textarea
                value={usesText}
                onChange={(e) => setUsesText(e.target.value)}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2f84c0]"
                placeholder="Job application&#10;Bank loan&#10;Government transactions"
              />
            </div>
          </div>

          {/* Submit Button */}
          <div className="mt-8 flex justify-end">
            <button
              type="submit"
              disabled={loading}
              className="bg-[#243b8e] text-white px-6 py-3 rounded-lg hover:bg-[#122361] transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              <Save size={18} />
              {loading ? 'Updating...' : 'Update Document Type'}
            </button>
          </div>
        </form>
      </div>
      <NotificationModal
        isOpen={!!notification}
        onClose={() => setNotification(null)}
        type={notification?.type}
        title={notification?.title}
        message={notification?.message}
        autoClose={notification?.autoClose}
      />
    </div>
  );
}
