export async function setDevice(deviceIndex) {
    console.log('Selected Device Index:', deviceIndex);
    
    try {
        const response = await fetch('/set_device', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({device_index: parseInt(deviceIndex)})
        });
        
        const data = await response.json();
        
        if (response.ok) {
            console.log(data.message);
            return { success: true, message: data.message };
        } else {
            console.error('Error setting device:', data.message);
            return { success: false, message: data.message };
        }
    } catch (error) {
        console.error('Error setting device:', error);
        return { success: false, message: error.message };
    }
}


export function recordTaskAudio(eventMarker, condition, action, question, callback) {
  fetch('/record_task_audio', { 
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      'event_marker': eventMarker,
      'condition': condition,
      'action': action,
      'question': question
    })
  })
  .then(response => response.json())
  .then(data => {
    if (data.message === 'Error starting recording.' || data.message === 'Invalid action.') {
      console.error(data.message);
      if (callback) callback(`Please stop playback... ${data.message}`);
      return;
    } else {
      console.log(data.message);
      if (callback) callback(data.message);
    }
  })
  .catch(error => {
    console.error('Error:', error);
    if (callback) callback(`Please stop playback... ${error}`);
  });
}

export async function startRecording() {
    try {
        const response = await fetch('/start_recording', {
            method: 'POST'
        });
        const data = await response.json();
        console.log("Recording started", data.status);
    } catch (error) {
        console.error('Recording Error:', error);
    }
}

export async function fetchAudioDevices() {
    try {
        const response = await fetch('/get_audio_devices');
        const data = await response.json();
        
        if (response.ok && !data.error) {
            console.log('Audio devices fetched:', data);
            return { success: true, devices: data };
        } else {
            console.error('Failed to fetch audio devices:', data.error || 'Unknown error');
            return { success: false, devices: [], error: data.error };
        }
    } catch (error) {
        console.error('Error fetching audio devices:', error);
        return { success: false, devices: [], error: error.message };
    }
}

export function playBeep() {
    const beepContext = new AudioContext();
    const oscillator = beepContext.createOscillator();
    const gainNode = beepContext.createGain();
    oscillator.type = 'sine'; 
    oscillator.frequency.setValueAtTime(500, beepContext.currentTime);
    gainNode.gain.setValueAtTime(0.07, beepContext.currentTime);
    oscillator.connect(gainNode);
    gainNode.connect(beepContext.destination);
    oscillator.start();
    setTimeout(() => {
        oscillator.stop();
    }, 300); 
}

export function setCondition(condition){
    fetch('/set_condition', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            'condition': condition
        })
    })
    .then(response => response.json())
    .then(data => {
        console.log(data.status);
    })
    .catch(error => console.error('status:', error));
}

// eslint-disable-next-line no-unused-vars
export function setEventMarker(eventMarker){
    fetch('/set_event_marker', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            'event_marker': eventMarker
        })
    })
    .then(response => response.json())
    .then(data => {
        console.log(data.status);
    })
    .catch(error => console.error('status:', error));
}