import { API_BASE_URL } from '@/lib/api';
import { useState, useEffect } from 'react';
import { X, Users, Mail, Phone, MapPin, Calendar, FileText, Eye, EyeOff, Upload, Trash2 } from 'lucide-react';
import { motion } from 'framer-motion';

export default function EditDetailsModal({ isOpen, onClose, resident, onSubmit }) {
  const [formData, setFormData] = useState({
    firstName: '',
    middleName: '',
    lastName: '',
    email: '',
    phoneNumber: '',
    birthDate: '',
    gender: '',
    region: '',
    province: '',
    city: '',
    barangay: '',
    sitio: '',
    addressLine1: ''
  });
  const [selectedFile, setSelectedFile] = useState(null);
  const [currentFileUrl, setCurrentFileUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [fileError, setFileError] = useState('');

  useEffect(() => {
    if (resident && isOpen) {
      setFormData({
        firstName: resident.firstName || '',
        middleName: resident.middleName || '',
        lastName: resident.lastName || '',
        email: resident.residentEmail || '',
        phoneNumber: resident.phoneNumber || '',
        birthDate: resident.birthdate ? resident.birthdate.split('T')[0] : '',
        gender: resident.gender || '',
        region: resident.region || '',
        province: resident.province || '',
        city: resident.city || '',
        barangay: resident.barangay || '',
        sitio: resident.sitio || '',
        addressLine1: resident.addressLine1 || ''
      });
      setCurrentFileUrl(resident.validIdPath ? `${API_BASE_URL}/${resident.validIdPath.replace(/\\/g, '/')}` : '');
      setSelectedFile(null);
    }
  }, [resident, isOpen]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file type
      const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg'];
      const fileType = file.type.toLowerCase();
      
      if (!allowedTypes.includes(fileType)) {
        setFileError('Invalid file type. Only PNG, JPG, and JPEG files are allowed.');
        setSelectedFile(null);
        // Clear the input
        e.target.value = '';
        return;
      }
      
      // Check file size (max 5MB)
      const maxSize = 5 * 1024 * 1024; // 5MB
      if (file.size > maxSize) {
        setFileError('File size too large. Maximum size is 5MB.');
        setSelectedFile(null);
        e.target.value = '';
        return;
      }
      
      setFileError('');
      setSelectedFile(file);
    }
  };

  const removeFile = () => {
    setSelectedFile(null);
    setCurrentFileUrl('');
    setFileError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const submitData = new FormData();

      // Add form data
      Object.keys(formData).forEach(key => {
        submitData.append(key, formData[key]);
      });

      // Add resident ID
      submitData.append('residentId', resident.residentId);

      // Add file if selected
      if (selectedFile) {
        submitData.append('validId', selectedFile);
      }

      await onSubmit(submitData);
      onClose();
    } catch (error) {
      console.error('Error submitting form:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !resident) return null;

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-labelledby="edit-modal-title">
      <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={onClose}></div>

      <div className="relative mx-auto p-2 sm:p-4 max-w-4xl h-full flex items-center justify-center">
        <motion.div
          className="bg-white rounded-2xl w-full max-h-[95vh] overflow-y-auto shadow-sm border border-gray-200"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
        >
          <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-[#eef3ff] to-white sticky top-0 z-10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="bg-gradient-to-r from-[#243b8e] to-purple-600 text-white rounded-lg p-2 w-10 h-10 flex-shrink-0 flex items-center justify-center shadow-sm">
                  <Users className="w-5 h-5" aria-hidden="true" />
                </div>
                <h2 id="edit-modal-title" className="font-bold text-2xl text-[#00114e]">
                  Edit Account Details
                </h2>
              </div>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-2 rounded-full transition-all"
                aria-label="Close modal"
              >
                <X className="w-6 h-6" aria-hidden="true" />
              </button>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            <div className="grid lg:grid-cols-2 gap-6 lg:gap-8">
              <div className="space-y-6">
                <div>
                  <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <Users className="w-5 h-5 text-[#243b8e]" aria-hidden="true" />
                    Personal Information
                  </h3>
                  <div className="bg-gray-50 p-4 rounded-lg border border-gray-100 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">First Name *</label>
                        <input
                          type="text"
                          name="firstName"
                          value={formData.firstName}
                          onChange={handleInputChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2f84c0] focus:border-transparent"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Last Name *</label>
                        <input
                          type="text"
                          name="lastName"
                          value={formData.lastName}
                          onChange={handleInputChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2f84c0] focus:border-transparent"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Middle Name</label>
                      <input
                        type="text"
                        name="middleName"
                        value={formData.middleName}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2f84c0] focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                      <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2f84c0] focus:border-transparent"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number *</label>
                      <input
                        type="tel"
                        name="phoneNumber"
                        value={formData.phoneNumber}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2f84c0] focus:border-transparent"
                        required
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Birth Date *</label>
                        <input
                          type="date"
                          name="birthDate"
                          value={formData.birthDate}
                          onChange={handleInputChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2f84c0] focus:border-transparent"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Gender *</label>
                        <select
                          name="gender"
                          value={formData.gender}
                          onChange={handleInputChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2f84c0] focus:border-transparent"
                          required
                        >
                          <option value="">Select Gender</option>
                          <option value="Male">Male</option>
                          <option value="Female">Female</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-[#243b8e]" aria-hidden="true" />
                    Address Information
                  </h3>
                  <div className="bg-gray-50 p-4 rounded-lg border border-gray-100 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Region *</label>
                        <select
                          name="region"
                          value={formData.region}
                          onChange={handleInputChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2f84c0] focus:border-transparent"
                          required
                        >
                          <option value="">Select Region</option>
                          <option value="Region VII">Region VII</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Province *</label>
                        <select
                          name="province"
                          value={formData.province}
                          onChange={handleInputChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2f84c0] focus:border-transparent"
                          required
                        >
                          <option value="">Select Province</option>
                          <option value="Cebu">Cebu</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">City *</label>
                        <select
                          name="city"
                          value={formData.city}
                          onChange={handleInputChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2f84c0] focus:border-transparent"
                          required
                        >
                          <option value="">Select City</option>
                          <option value="Cebu City">Cebu City</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Barangay *</label>
                        <select
                          name="barangay"
                          value={formData.barangay}
                          onChange={handleInputChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2f84c0] focus:border-transparent"
                          required
                        >
                          <option value="">Select Barangay</option>
                          <option value="Pardo (Pob.)">Pardo (Pob.)</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Sitio *</label>
                      <input
                        type="text"
                        name="sitio"
                        value={formData.sitio}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2f84c0] focus:border-transparent"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Address Line 1 *</label>
                      <input
                        type="text"
                        name="addressLine1"
                        value={formData.addressLine1}
                        onChange={handleInputChange}
                        placeholder="House No., Street Name, etc."
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2f84c0] focus:border-transparent"
                        required
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <div>
                  <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <FileText className="w-5 h-5 text-[#243b8e]" aria-hidden="true" />
                    Valid ID Document
                  </h3>
                  <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Upload New Valid ID (Optional)
                        </label>
                        <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 bg-white">
                          <div className="flex flex-col items-center justify-center">
                            <input
                              type="file"
                              id="file-upload"
                              accept="image/png,image/jpeg,image/jpg"
                              onChange={handleFileChange}
                              className="hidden"
                            />
                            <label
                              htmlFor="file-upload"
                              className="cursor-pointer flex flex-col items-center gap-2 text-gray-500 hover:text-[#243b8e] transition-colors"
                            >
                              <Upload className="w-8 h-8" />
                              <span className="text-sm font-medium">Click to upload new file</span>
                              <span className="text-xs text-gray-400">Supported: PNG, JPG, JPEG only</span>
                            </label>
                          </div>
                        </div>
                      </div>

                      {(selectedFile || currentFileUrl) && (
                        <div className="border border-gray-200 rounded-lg p-4 bg-white">
                          <h4 className="text-sm font-medium text-gray-900 mb-3">Current/Selected File</h4>
                          {selectedFile ? (
                            <div className="flex items-center justify-between bg-[#eef3ff] p-3 rounded-md border border-[#d8def2]">
                              <div className="flex items-center gap-3">
                                <FileText className="w-5 h-5 text-[#2f84c0]" />
                                <div>
                                  <p className="text-sm font-medium text-gray-900">{selectedFile.name}</p>
                                  <p className="text-xs text-gray-500">{(selectedFile.size / 1024).toFixed(0)} KB</p>
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={removeFile}
                                className="text-gray-400 hover:text-red-500 transition-colors"
                              >
                                <Trash2 className="w-5 h-5" />
                              </button>
                            </div>
                          ) : currentFileUrl ? (
                            <div className="flex items-center justify-between bg-green-50 p-3 rounded-md border border-green-100">
                              <div className="flex items-center gap-3">
                                <FileText className="w-5 h-5 text-green-500" />
                                <div>
                                  <p className="text-sm font-medium text-gray-900">Current Valid ID</p>
                                  <p className="text-xs text-gray-500">Click to view</p>
                                </div>
                              </div>
                              <div className="flex gap-2">
                                <button
                                  type="button"
                                  onClick={() => window.open(currentFileUrl, '_blank')}
                                  className="text-[#243b8e] hover:text-[#122361] text-sm font-medium"
                                >
                                  View
                                </button>
                                <button
                                  type="button"
                                  onClick={removeFile}
                                  className="text-gray-400 hover:text-red-500 transition-colors"
                                >
                                  <Trash2 className="w-5 h-5" />
                                </button>
                              </div>
                            </div>
                          ) : null}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-6 border-t border-gray-200">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium shadow-sm"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-6 py-2 bg-[#243b8e] text-white rounded-lg hover:bg-[#122361] transition-colors font-medium shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={loading}
              >
                {loading ? 'Resubmitting...' : 'Resubmit Application'}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </div>
  );
}