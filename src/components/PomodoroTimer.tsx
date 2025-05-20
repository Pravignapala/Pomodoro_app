import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Box,
  Typography,
  Button,
  Paper,
  CircularProgress,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  ButtonGroup,
  Tooltip,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  PlayArrow,
  Pause,
  Refresh,
  Settings as SettingsIcon,
  VolumeUp,
  WorkOutline,
  Coffee,
  Weekend,
  VolumeOff,
  Timer,
  Notifications,
  HelpOutline,
} from '@mui/icons-material';

interface TimerSettings {
  workTime: number;
  shortBreakTime: number;
  longBreakTime: number;
  longBreakInterval: number;
  soundType: string;
  volume: number;
}

const defaultSettings: TimerSettings = {
  workTime: 25,
  shortBreakTime: 5,
  longBreakTime: 15,
  longBreakInterval: 4,
  soundType: 'bell',
  volume: 0.5,
};

const SOUND_OPTIONS = {
  bell: './sounds/bell.mp3',
  chime: './sounds/chime.mp3',
};

type TimerMode = 'work' | 'shortBreak' | 'longBreak';

const PomodoroTimer = () => {
  const [timeLeft, setTimeLeft] = useState(defaultSettings.workTime * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [mode, setMode] = useState<TimerMode>('work');
  const [completedPomodoros, setCompletedPomodoros] = useState(0);
  const [settings, setSettings] = useState<TimerSettings>(defaultSettings);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);
  const [welcomeStep, setWelcomeStep] = useState(0);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [touchStartY, setTouchStartY] = useState<number | null>(null);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);

  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const getTimeForMode = useCallback((mode: TimerMode) => {
    switch (mode) {
      case 'work':
        return settings.workTime * 60;
      case 'shortBreak':
        return settings.shortBreakTime * 60;
      case 'longBreak':
        return settings.longBreakTime * 60;
    }
  }, [settings]);

  const resetTimer = useCallback(() => {
    setTimeLeft(getTimeForMode(mode));
    setIsRunning(false);
  }, [mode, getTimeForMode]);

  const switchMode = useCallback((newMode: TimerMode) => {
    setMode(newMode);
    setTimeLeft(getTimeForMode(newMode));
    setIsRunning(false);
  }, [getTimeForMode]);

  const toggleTimer = () => {
    setIsRunning(!isRunning);
  };

  useEffect(() => {
    // Initialize audio element
    audioRef.current = new Audio();
    audioRef.current.preload = 'auto';
    
    // Cleanup on unmount
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const playSound = useCallback(() => {
    if (isMuted) return;

    let audioContext: AudioContext | null = null;
    let source: AudioBufferSourceNode | null = null;
    let gainNode: GainNode | null = null;

    try {
      // Create audio context
      audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      source = audioContext.createBufferSource();
      gainNode = audioContext.createGain();

      // Load and play the sound
      fetch(SOUND_OPTIONS[settings.soundType as keyof typeof SOUND_OPTIONS])
        .then(response => response.arrayBuffer())
        .then(arrayBuffer => audioContext?.decodeAudioData(arrayBuffer))
        .then(audioBuffer => {
          if (!audioContext || !source || !gainNode || !audioBuffer) return;

          source.buffer = audioBuffer;
          source.connect(gainNode);
          gainNode.connect(audioContext.destination);
          gainNode.gain.value = settings.volume;
          
          // Play for exactly 1 second
          source.start(0);
          
          // Cleanup after 1 second
          setTimeout(() => {
            if (source) {
              source.stop();
            }
            if (audioContext) {
              audioContext.close();
            }
          }, 1000);
        })
        .catch(error => {
          console.error('Error loading sound:', error);
          // Fallback to simple beep
          if (!audioContext) return;
          
          const oscillator = audioContext.createOscillator();
          const fallbackGain = audioContext.createGain();
          
          oscillator.connect(fallbackGain);
          fallbackGain.connect(audioContext.destination);
          
          fallbackGain.gain.value = settings.volume * 0.1;
          oscillator.frequency.value = 800;
          
          oscillator.start();
          
          // Cleanup after 1 second
          setTimeout(() => {
            oscillator.stop();
            if (audioContext) {
              audioContext.close();
            }
          }, 1000);
        });
    } catch (error) {
      console.error('Error in playSound:', error);
      // Ensure cleanup on error
      if (audioContext) {
        audioContext.close();
      }
    }
  }, [settings.soundType, settings.volume, isMuted]);

  const testSound = () => {
    playSound();
  };

  const handleTimerComplete = useCallback(() => {
    if (mode === 'work') {
      setCompletedPomodoros(prev => prev + 1);
      const nextMode = (completedPomodoros + 1) % settings.longBreakInterval === 0 ? 'longBreak' : 'shortBreak';
      switchMode(nextMode);
    } else {
      switchMode('work');
    }
    
    // Play sound
    playSound();
  }, [mode, completedPomodoros, settings.longBreakInterval, switchMode, playSound]);

  useEffect(() => {
    let interval: number | undefined;

    if (isRunning && timeLeft > 0) {
      interval = window.setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            handleTimerComplete();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [isRunning, timeLeft, handleTimerComplete]);

  const progress = (getTimeForMode(mode) - timeLeft) / getTimeForMode(mode) * 100;

  const welcomeSteps = [
    {
      title: "Welcome to Pomodoro Timer!",
      content: "This app helps you stay focused and productive using the Pomodoro Technique. Let's go through the main features.",
      icon: <HelpOutline sx={{ fontSize: 40, color: theme.palette.primary.main }} />
    },
    {
      title: "Timer Modes",
      content: "Choose between three modes:",
      items: [
        { icon: <WorkOutline />, text: "Work: 25 minutes of focused work" },
        { icon: <Coffee />, text: "Short Break: 5 minutes to rest" },
        { icon: <Weekend />, text: "Long Break: 15 minutes after 4 work sessions" }
      ]
    },
    {
      title: "Basic Controls",
      content: "Use these buttons to control your timer:",
      items: [
        { icon: <PlayArrow />, text: "Start/Pause: Control the timer" },
        { icon: <Refresh />, text: "Reset: Start the current session over" },
        { icon: <SettingsIcon />, text: "Settings: Customize your experience" }
      ]
    },
    {
      title: "Settings & Customization",
      content: "In settings, you can:",
      items: [
        { icon: <Timer />, text: "Adjust timer durations" },
        { icon: <VolumeUp />, text: "Choose notification sounds" },
        { icon: <Notifications />, text: "Enable/disable notifications" }
      ]
    }
  ];

  const handleWelcomeClose = () => {
    setShowWelcome(false);
    localStorage.setItem('welcomeShown', 'true');
  };

  const handleWelcomeNext = () => {
    if (welcomeStep < welcomeSteps.length - 1) {
      setWelcomeStep(welcomeStep + 1);
    } else {
      handleWelcomeClose();
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStartY(e.touches[0].clientY);
    setTouchStartX(e.touches[0].clientX);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartY === null || touchStartX === null) return;

    const touchEndY = e.changedTouches[0].clientY;
    const touchEndX = e.changedTouches[0].clientX;
    const deltaY = touchEndY - touchStartY;
    const deltaX = touchEndX - touchStartX;

    // Reset touch coordinates
    setTouchStartY(null);
    setTouchStartX(null);

    // Only handle vertical swipes
    if (Math.abs(deltaY) > Math.abs(deltaX)) {
      if (Math.abs(deltaY) > 50) { // Minimum swipe distance
        if (deltaY > 0) {
          // Swipe down - pause timer
          if (isRunning) {
            setIsRunning(false);
          }
        } else {
          // Swipe up - start timer
          if (!isRunning) {
            setIsRunning(true);
          }
        }
      }
    }
  };

  return (
    <Box sx={{ 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      gap: 4,
      p: 3,
      maxWidth: '600px',
      mx: 'auto',
      touchAction: 'none' // Prevent default touch actions
    }}>
      <Paper
        elevation={3}
        sx={{
          p: 4,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 3,
          width: '100%',
          maxWidth: 400,
          userSelect: 'none', // Prevent text selection
          WebkitTapHighlightColor: 'transparent', // Remove tap highlight on mobile
        }}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <Box 
          sx={{ 
            position: 'relative', 
            display: 'inline-flex',
            touchAction: 'none',
            cursor: 'pointer'
          }}
        >
          <CircularProgress
            variant="determinate"
            value={progress}
            size={isMobile ? 180 : 200}
            thickness={4}
            sx={{ 
              color: mode === 'work' ? 'primary.main' : 
                     mode === 'shortBreak' ? 'secondary.main' : 
                     'success.main',
              touchAction: 'none'
            }}
          />
          <Box
            sx={{
              top: 0,
              left: 0,
              bottom: 0,
              right: 0,
              position: 'absolute',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexDirection: 'column',
              touchAction: 'none'
            }}
          >
            <Typography 
              variant={isMobile ? "h3" : "h2"} 
              component="div" 
              color="text.primary"
              sx={{ userSelect: 'none' }}
            >
              {formatTime(timeLeft)}
            </Typography>
            <Typography 
              variant={isMobile ? "subtitle1" : "h6"} 
              color="text.secondary"
              sx={{ userSelect: 'none' }}
            >
              {mode === 'work' ? 'Work Time' : 
               mode === 'shortBreak' ? 'Short Break' : 
               'Long Break'}
            </Typography>
          </Box>
        </Box>

        <ButtonGroup 
          variant="contained" 
          aria-label="timer mode selection"
          sx={{
            width: '100%',
            '& .MuiButton-root': {
              flex: 1,
              minWidth: 0,
              px: isMobile ? 1 : 2
            }
          }}
        >
          <Button
            onClick={() => switchMode('work')}
            startIcon={<WorkOutline />}
            color={mode === 'work' ? 'primary' : 'inherit'}
          >
            {isMobile ? 'Work' : 'Work'}
          </Button>
          <Button
            onClick={() => switchMode('shortBreak')}
            startIcon={<Coffee />}
            color={mode === 'shortBreak' ? 'secondary' : 'inherit'}
          >
            {isMobile ? 'Short' : 'Short Break'}
          </Button>
          <Button
            onClick={() => switchMode('longBreak')}
            startIcon={<Weekend />}
            color={mode === 'longBreak' ? 'success' : 'inherit'}
          >
            {isMobile ? 'Long' : 'Long Break'}
          </Button>
        </ButtonGroup>

        <Box sx={{ 
          display: 'flex', 
          gap: 2,
          '& .MuiIconButton-root': {
            touchAction: 'manipulation'
          }
        }}>
          <IconButton 
            onClick={toggleTimer} 
            color="primary" 
            size={isMobile ? "medium" : "large"}
            sx={{ touchAction: 'manipulation' }}
          >
            {isRunning ? <Pause /> : <PlayArrow />}
          </IconButton>
          <IconButton 
            onClick={resetTimer} 
            color="primary" 
            size={isMobile ? "medium" : "large"}
            sx={{ touchAction: 'manipulation' }}
          >
            <Refresh />
          </IconButton>
          <IconButton 
            onClick={() => setIsSettingsOpen(true)} 
            color="primary" 
            size={isMobile ? "medium" : "large"}
            sx={{ touchAction: 'manipulation' }}
          >
            <SettingsIcon />
          </IconButton>
          <Tooltip title={isMuted ? "Unmute" : "Mute"}>
            <IconButton 
              onClick={() => setIsMuted(!isMuted)} 
              color={isMuted ? "error" : "primary"} 
              size={isMobile ? "medium" : "large"}
              sx={{ touchAction: 'manipulation' }}
            >
              {isMuted ? <VolumeOff /> : <VolumeUp />}
            </IconButton>
          </Tooltip>
        </Box>

        <Typography 
          variant="body1" 
          color="text.secondary"
          sx={{ userSelect: 'none' }}
        >
          Completed Pomodoros: {completedPomodoros}
        </Typography>
      </Paper>

      <Dialog open={isSettingsOpen} onClose={() => setIsSettingsOpen(false)}>
        <DialogTitle>Timer Settings</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
            <TextField
              label="Work Time (minutes)"
              type="number"
              value={settings.workTime}
              onChange={(e) => setSettings(prev => ({ ...prev, workTime: Number(e.target.value) }))}
            />
            <TextField
              label="Short Break (minutes)"
              type="number"
              value={settings.shortBreakTime}
              onChange={(e) => setSettings(prev => ({ ...prev, shortBreakTime: Number(e.target.value) }))}
            />
            <TextField
              label="Long Break (minutes)"
              type="number"
              value={settings.longBreakTime}
              onChange={(e) => setSettings(prev => ({ ...prev, longBreakTime: Number(e.target.value) }))}
            />
            <TextField
              label="Long Break Interval"
              type="number"
              value={settings.longBreakInterval}
              onChange={(e) => setSettings(prev => ({ ...prev, longBreakInterval: Number(e.target.value) }))}
            />
            <FormControl fullWidth>
              <InputLabel>Notification Sound</InputLabel>
              <Select
                value={settings.soundType}
                label="Notification Sound"
                onChange={(e) => setSettings(prev => ({ ...prev, soundType: e.target.value }))}
              >
                <MenuItem value="bell">Bell</MenuItem>
                <MenuItem value="chime">Chime</MenuItem>
              </Select>
            </FormControl>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <VolumeUp />
              <TextField
                label="Volume"
                type="range"
                inputProps={{ min: 0, max: 1, step: 0.1 }}
                value={settings.volume}
                onChange={(e) => setSettings(prev => ({ ...prev, volume: Number(e.target.value) }))}
                sx={{ width: '100%' }}
              />
            </Box>
            <Button 
              variant="outlined" 
              onClick={testSound}
              startIcon={<VolumeUp />}
            >
              Test Sound
            </Button>
            
            <Divider sx={{ my: 2 }} />
            
            <Button 
              variant="outlined" 
              onClick={() => {
                setIsSettingsOpen(false);
                setShowWelcome(true);
              }}
              startIcon={<HelpOutline />}
              fullWidth
            >
              View User Guide
            </Button>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsSettingsOpen(false)}>Cancel</Button>
          <Button onClick={() => {
            setIsSettingsOpen(false);
            resetTimer();
          }}>Save</Button>
        </DialogActions>
      </Dialog>

      {/* Welcome Dialog */}
      <Dialog 
        open={showWelcome} 
        onClose={() => setShowWelcome(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 2,
            p: 1
          }
        }}
      >
        <DialogTitle sx={{ 
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 2
        }}>
          {welcomeSteps[welcomeStep].icon}
          <Typography variant="h5" component="div">
            {welcomeSteps[welcomeStep].title}
          </Typography>
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1" sx={{ mb: 2, textAlign: 'center' }}>
            {welcomeSteps[welcomeStep].content}
          </Typography>
          {welcomeSteps[welcomeStep].items && (
            <List>
              {welcomeSteps[welcomeStep].items.map((item, index) => (
                <ListItem key={index} sx={{ py: 1 }}>
                  <ListItemIcon sx={{ minWidth: 40 }}>
                    {item.icon}
                  </ListItemIcon>
                  <ListItemText primary={item.text} />
                </ListItem>
              ))}
            </List>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, justifyContent: 'space-between' }}>
          <Button 
            onClick={() => setShowWelcome(false)}
            color="inherit"
          >
            Close
          </Button>
          <Button 
            onClick={handleWelcomeNext}
            variant="contained"
            color="primary"
          >
            {welcomeStep < welcomeSteps.length - 1 ? 'Next' : 'Finish'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default PomodoroTimer; 