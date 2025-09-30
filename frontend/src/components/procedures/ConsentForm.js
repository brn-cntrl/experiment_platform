// ConsentForm.js - Updated with consent agreement checkbox

import React, { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import './ConsentForm.css'; // You'll need to create this CSS file
import { setEventMarker } from '../utils/helpers';

const ConsentForm = forwardRef(({ procedure, sessionId }, ref) => {
  const [consentMethod, setConsentMethod] = useState(null);
  const [consentData, setConsentData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error] = useState(null);
  const [consentAgreed, setConsentAgreed] = useState(false); // New state for checkbox

  useImperativeHandle(ref, () => ({
    handleProcedureComplete: async () => {
      // Check if consent checkbox is checked before proceeding
      if (!consentAgreed) {
        alert('Please confirm that you have read and agree to the consent form before continuing.');
        throw new Error('Consent not provided'); // Throw error to prevent completion
      }

      // Handle consent-specific completion logic
      try {
        await fetch(`/api/sessions/${sessionId}/record-consent`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            consentGiven: true,
            consentMethod: consentMethod,
            consentAgreed: consentAgreed,
            timestamp: new Date().toISOString()
          })
        });
        setEventMarker('subject_idle');
        console.log('Consent recorded successfully');
      } catch (error) {
        console.error('Error recording consent:', error);
        throw error; // Re-throw so parent can handle
      }
    }
  }));

  useEffect(() => {
    // Extract consent configuration from procedure
    const config = procedure?.configuration || {};
    const documentConfig = config.document || {};
    const wizardData = procedure?.wizardData || {};
    
    // Check multiple possible locations for consent configuration
    if (documentConfig.consentFilePath || wizardData.consentFilePath) {
      setConsentMethod('upload');
      setConsentData({
        filePath: documentConfig.consentFilePath || wizardData.consentFilePath,
        fileName: documentConfig.consentFile || wizardData.consentFile
      });
    } else if (documentConfig.consentLink || wizardData.consentLink) {
      setConsentMethod('link');
      setConsentData({
        link: documentConfig.consentLink || wizardData.consentLink
      });
    } else {
      // Check rawConfiguration as backup
      const rawConfig = wizardData.rawConfiguration?.document || {};
      if (rawConfig.consentFilePath) {
        setConsentMethod('upload');
        setConsentData({
          filePath: rawConfig.consentFilePath,
          fileName: rawConfig.consentFile
        });
      } else if (rawConfig.consentLink) {
        setConsentMethod('link');
        setConsentData({
          link: rawConfig.consentLink
        });
      } else {
        // If no configuration found, show a default consent form message
        setConsentMethod('default');
        setConsentData(null);
      }
    }
    
    setLoading(false);
  }, [procedure]);

  const handleConsentChange = (e) => {
    setConsentAgreed(e.target.checked);
  };

  if (loading) {
    return (
      <div className="consent-form-container">
        <div className="loading">
          <h3>Loading consent form...</h3>
          <div className="loading-spinner">⏳</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="consent-form-container">
        <div className="error">
          <h3>Error Loading Consent Form</h3>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="consent-form-container">
      {/* <div className="consent-header">
        <h2>Informed Consent</h2>
        <p>Please review the consent form and provide your consent to participate in this study.</p>
      </div> */}

      <div className="consent-content">
        {consentMethod === 'upload' && consentData?.filePath && (
          <div className="pdf-container">
            <h3>Consent Document</h3>
            <div className="pdf-viewer">
              <iframe
                src={`/static/consent_forms/${consentData.filePath.split('/').slice(-2).join('/')}`}
                width="100%"
                height="600px"
                title="Consent Form"
                style={{
                  border: '1px solid #ccc',
                  borderRadius: '4px'
                }}
              >
                <p>
                  Your browser does not support displaying PDF files. 
                  <a href={`/static/consent_forms/${consentData.filePath.split('/').slice(-2).join('/')}`} target="_blank" rel="noopener noreferrer">
                    Click here to download the consent form.
                  </a>
                </p>
              </iframe>
            </div>
          </div>
        )}

        {consentMethod === 'link' && consentData?.link && (
          <div className="link-container">
            <h3>Consent Document</h3>
            <div className="link-viewer">
              <iframe
                src={consentData.link}
                width="100%"
                height="600px"
                title="Consent Form"
                style={{
                  border: '1px solid #ccc',
                  borderRadius: '4px'
                }}
              >
                <p>
                  Your browser does not support displaying this document. 
                  <a href={consentData.link} target="_blank" rel="noopener noreferrer">
                    Click here to view the consent form.
                  </a>
                </p>
              </iframe>
            </div>
          </div>
        )}

        {consentMethod === 'default' && (
          <div className="default-consent-container">
            <div className="default-consent-content">
              <p>
                You are being invited to participate in a research study. Before you agree to participate, 
                please read the following information. 
              </p>
              <div className="consent-points">
                <h4>Instructions:</h4>
                <ul>
                  <li>The experimenter will present you with a hard copy consent form. Please read the form carefully and ask any questions you may have.</li>
                  <li>Please fill out the form, then print and sign your name.</li>
                  <li>Your data will be kept confidential</li>
                </ul>
              </div>
              <p>
                By checking the agreement box below, you indicate that you have read and understood 
                this information and the consent form. 
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Consent Agreement Checkbox */}
      <div className="consent-agreement">
        <div className="agreement-checkbox">
          <label className="checkbox-container">
            <input
              type="checkbox"
              checked={consentAgreed}
              onChange={handleConsentChange}
              className="consent-checkbox"
            />
            <span className="checkmark"></span>
            <span className="checkbox-text">
              <strong>I have read and understand the consent form. I have signed the form and voluntarily agree to participate in this research study.</strong>
            </span>
          </label>
        </div>
        
        {!consentAgreed && (
          <div className="agreement-reminder">
            <p className="reminder-text">
              ⚠️ Please check the box above to confirm your consent before proceeding.
            </p>
          </div>
        )}
        
        {consentAgreed && (
          <div className="agreement-confirmed">
            <p className="confirmed-text">
              ✅ Thank you for providing your consent. You may now complete the task.
            </p>
          </div>
        )}
      </div>
    </div>
  );
});

export default ConsentForm;