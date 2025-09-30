import React, { useState, useEffect, useCallback } from 'react';
import './SurveyComponent.css';

const SurveyComponent = ({ procedure, sessionId }) => {
  const [surveyUrl, setSurveyUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  // const [surveyCompleted, setSurveyCompleted] = useState(false);

  const loadSurveyUrl = useCallback(async () => {
    try {
      setLoading(true);
      setError('');

      // Extract survey configuration
      const surveyConfig = procedure?.configuration?.['survey-details'];
      if (!surveyConfig?.surveyName || !surveyConfig?.googleFormUrl) {
        setError('Survey configuration is incomplete. Please contact the experimenter.');
        setLoading(false);
        return;
      }

      // Call Flask route to get autofilled URL
      const response = await fetch('/api/get-autofilled-survey-url', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          session_id: sessionId,
          survey_name: surveyConfig.surveyName,
          survey_url: surveyConfig.googleFormUrl
        })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setSurveyUrl(data.autofilled_url);
      } else {
        setError(data.error || 'Failed to load survey URL');
      }
    } catch (error) {
      console.error('Error loading survey URL:', error);
      setError('Failed to load survey. Please contact the experimenter.');
    } finally {
      setLoading(false);
    }
  }, [procedure, sessionId]);

  useEffect(() => {
    loadSurveyUrl();
  }, [loadSurveyUrl]);

  // const handleTaskComplete = async () => {
  //   try {
  //     // Mark survey as completed
  //     setSurveyCompleted(true);
      
  //     // Call the parent completion handler
  //     if (onTaskComplete) {
  //       await onTaskComplete();
  //     }
  //   } catch (error) {
  //     console.error('Error completing survey task:', error);
  //   }
  // };

  const getSurveyName = () => {
    return procedure?.configuration?.['survey-details']?.surveyName || 'Survey';
  };

  // if (surveyCompleted) {
  //   return (
  //     <div className="survey-component">
  //       <div className="completion-message">
  //         <div className="completion-icon">✅</div>
  //         <h2>Survey Completed!</h2>
  //         <p>Thank you for completing the {getSurveyName()}.</p>
  //         <p>Please wait for the experimenter to continue.</p>
  //       </div>
  //     </div>
  //   );
  // }

  return (
    <div className="survey-component">
      <div className="procedure-header">
        <div className="procedure-title">
          <h2>{getSurveyName()}</h2>
          <h3>Please complete the survey below</h3>
        </div>
        <div className="procedure-meta">
          <div className="duration">Duration: ~{procedure?.customDuration || procedure?.duration || 10} minutes</div>
          <div className="active-metrics">
            <span>Survey Active</span>
            <div className="status-dot active"></div>
          </div>
        </div>
      </div>

      <div className="procedure-content">
        <div className="task-instructions">
          <h4>Instructions</h4>
          <ul>
            <li>Please complete the survey form below honestly and to the best of your ability</li>
            <li>All responses are confidential and will only be used for research purposes</li>
            <li>Take your time to read each question carefully before responding</li>
            <li>Once you have submitted the survey, click "Task Complete" to continue</li>
          </ul>
        </div>

        <div className="survey-interface">
          {loading && (
            <div className="survey-loading">
              <div className="loading-spinner">⏳</div>
              <p>Loading survey...</p>
            </div>
          )}

          {error && (
            <div className="survey-error">
              <div className="error-icon">❌</div>
              <h4>Survey Loading Error</h4>
              <p>{error}</p>
              <button onClick={loadSurveyUrl} className="retry-btn">
                🔄 Retry
              </button>
            </div>
          )}

          {!loading && !error && surveyUrl && (
            <div className="survey-container">
              <div className="survey-frame-container">
                <iframe
                  src={surveyUrl}
                  width="100%"
                  height="600"
                  frameBorder="0"
                  title={`${getSurveyName()} Survey`}
                  className="survey-iframe"
                >
                  Loading survey...
                </iframe>
              </div>
              
              <div className="survey-completion-note">
                <p><strong>Important:</strong> After submitting your responses in the survey above, please click the "Task Complete" button below to continue with the experiment.</p>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="task-status">
        <div className="status-indicator">
          <div className="status-dot active"></div>
          <span>Survey loaded and ready</span>
        </div>
        {/* <button 
          onClick={handleTaskComplete} 
          className="task-complete-btn"
          disabled={loading || error}
        >
          ✅ Task Complete
        </button> */}
      </div>
    </div>
  );
};

export default SurveyComponent;