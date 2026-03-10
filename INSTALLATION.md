# Installation Guide - README Addition

Add this section to your main README.md to guide users through the installation process.

---

## Quick Start Installation

### Automated Installation (Recommended)

```bash
# Clone the repository
git clone https://github.com/brn-cntrl/experiment_platform.git
cd experiment_platform

# Run the installation script
chmod +x install.sh
./install.sh

# Download large assets
chmod +x download_assets.sh
./download_assets.sh

# Verify installation
chmod +x verify_installation.sh
./verify_installation.sh
```

### Manual Installation

If you prefer to install manually or the automated script fails, follow these steps:

#### 1. Prerequisites

**macOS Requirements:**
- macOS 10.15 or later (Apple Silicon or Intel)
- Homebrew package manager
- Python 3.11.4
- Node.js 14+ and npm

**Install Homebrew** (if not already installed):
```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

**Install Python 3.11:**
```bash
brew install python@3.11
```

**Install Node.js:**
```bash
brew install node
```

#### 2. System Dependencies

```bash
# Install HDF5 for data storage
brew install hdf5
export HDF5_DIR=$(brew --prefix hdf5)

# Install Lab Streaming Layer for biometric data
brew tap labstreaminglayer/tap
brew install lsl

# Add LSL to library path
echo 'export DYLD_LIBRARY_PATH=/opt/homebrew/lib:$DYLD_LIBRARY_PATH' >> ~/.zshrc
source ~/.zshrc

# Install audio dependencies
brew install portaudio ffmpeg
```

#### 3. Python Environment

```bash
# Optional but recommended: Create virtual environment
python3.11 -m venv venv
source venv/bin/activate

# Upgrade pip
pip install --upgrade pip

# Install h5py with HDF5 support
pip install --no-cache-dir h5py

# Install Lab Streaming Layer Python bindings
pip install pylsl

# Install Python dependencies
pip install -r requirements.txt

# Install Flask and related packages
pip install flask flask-cors werkzeug
```

#### 4. Frontend Setup

```bash
cd frontend
npm install
cd ..
```

#### 5. Large Files Setup

This application requires large files from Google Drive that cannot be hosted on GitHub:

**Option 1: Automated Download**
```bash
chmod +x download_assets.sh
./download_assets.sh
```

**Option 2: Manual Download**

Download the XRLAB_assets.zip file from Google Drive: [Download link](TBD)

Then extract and organize:
```bash
# Extract the archive
unzip XRLAB_assets.zip

# Move to correct locations
mv XRLAB_assets/SER_MODEL .
mv XRLAB_assets/video_files static/

# Cleanup
rm -rf XRLAB_assets XRLAB_assets.zip
```

**Required Files:**
- **SER_MODEL/** - Speech Emotion Recognition model (goes to project root)
- **video_files/** - Experiment video stimuli (goes to `static/` directory)

**Note:** Audio files are already included in the GitHub repository.

See [DOWNLOAD_INSTRUCTIONS.md](DOWNLOAD_INSTRUCTIONS.md) for alternative download methods and detailed instructions.

#### 6. Configuration

Create a `.env` file in the project root:

```bash
cat > .env << 'EOF'
# Azure Speech Services Configuration
AZURE_SPEECH_KEY=your_azure_speech_key_here
AZURE_SPEECH_REGION=your_azure_region_here

# Database Configuration
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_NAME=experiment_platform
DATABASE_USER=your_db_user
DATABASE_PASSWORD=your_db_password

# Flask Configuration
FLASK_SECRET_KEY=your_secret_key_here
FLASK_ENV=development

# Application Settings
UPLOAD_FOLDER=uploads
MAX_CONTENT_LENGTH=16777216
EOF
```

**Important:** Edit the `.env` file and replace placeholder values with your actual credentials.

#### 7. Database Setup (Optional)

If you plan to use database features:

```bash
# Install PostgreSQL
brew install postgresql

# Start PostgreSQL service
brew services start postgresql

# Create database
createdb experiment_platform

# Import schema
psql experiment_platform < database_schema.sql
```

See [DATABASE_SETUP.md](DATABASE_SETUP.md) for detailed database configuration.

### Running the Application

#### Start Backend Server

```bash
# If using virtual environment
source venv/bin/activate

# Start Flask server
python app.py
```

The backend API will be available at `http://localhost:5001`

#### Start Frontend Development Server

In a new terminal:

```bash
cd frontend
npm start
```

The application will open in your browser at `http://localhost:3000`

### Verification

Run the verification script to ensure everything is properly installed:

```bash
chmod +x verify_installation.sh
./verify_installation.sh
```

This will check:
- ✓ System requirements
- ✓ System dependencies
- ✓ Python packages
- ✓ Project structure
- ✓ Configuration files
- ✓ Frontend setup

---

## Troubleshooting

### Common Issues

**Issue: `ModuleNotFoundError: No module named 'h5py'`**

Solution:
```bash
export HDF5_DIR=$(brew --prefix hdf5)
pip install --no-cache-dir h5py
```

**Issue: `OSError: Could not find LSL library`**

Solution:
```bash
export DYLD_LIBRARY_PATH=/opt/homebrew/lib:$DYLD_LIBRARY_PATH
# Add to ~/.zshrc for persistence
```

**Issue: `Frontend can't connect to backend`**

Solution:
- Ensure backend is running on port 5001
- Check for CORS configuration in Flask
- Verify both servers are running

**Issue: `timestamp_manager.cpython-311-darwin.so: mach-o file, but is an incompatible architecture`**

Solution:
- The .so file is architecture-specific (Apple Silicon vs Intel)
- May need to recompile for your specific Mac architecture

**Issue: `Large files missing`**

Solution:
- Run `./download_assets.sh`
- Or manually download XRLAB_assets.zip from Google Drive
- Ensure files are in correct locations:
  - `SER_MODEL/` in project root
  - `video_files/` in `static/` directory

### Getting Help

If you encounter issues:

1. Check the [Setup Checklist](SETUP_CHECKLIST.md)
2. Review [Download Instructions](DOWNLOAD_INSTRUCTIONS.md)
3. Search existing [GitHub Issues](https://github.com/brn-cntrl/experiment_platform/issues)
4. Create a new issue with:
   - Your macOS version and architecture
   - Python version
   - Complete error message
   - Steps to reproduce

---

## Development

**Note:** Audio files are included in the repository in their designated locations.

### Key Technologies

**Backend:**
- Flask (web framework)
- h5py (HDF5 data storage)
- pylsl (Lab Streaming Layer)
- Azure Speech Services (transcription)

**Frontend:**
- React 18
- CSS Modules
- Server-Sent Events (SSE)

**Data Collection:**
- EmotiBit integration
- Vernier respiratory belt
- Audio recording and transcription
- Speech Emotion Recognition

---

## Next Steps

After successful installation:

1. **Configure Experiments**: Use the experiment builder to create or modify protocols
2. **Test Hardware**: Connect biometric sensors and verify data streams
3. **Run Test Session**: Create a test subject and run through an experiment
4. **Review Documentation**: 
   - [Usage Guide](USAGE.md)
   - [Database Setup](DATABASE_SETUP.md)
   - [Download Instructions](DOWNLOAD_INSTRUCTIONS.md)

---

## Support

For questions or issues:
- Email: [your-email]
- GitHub Issues: https://github.com/brn-cntrl/experiment_platform/issues
- Documentation: See README.md and related docs