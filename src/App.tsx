import { ThemeProvider, createTheme, CssBaseline, Container, Box } from '@mui/material';
import PomodoroTimer from './components/PomodoroTimer';

const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#ff6b6b',
    },
    secondary: {
      main: '#4ecdc4',
    },
    background: {
      default: '#2d3436',
      paper: '#353b48',
    },
  },
});

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Container maxWidth="sm">
        <Box
          sx={{
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            py: 4,
          }}
        >
          <PomodoroTimer />
        </Box>
      </Container>
    </ThemeProvider>
  );
}

export default App;
