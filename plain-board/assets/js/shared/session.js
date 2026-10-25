// There are no real accounts. The demo sign-in remembers a sample person in this browser
// and nothing else. Replace this file when you connect a real sign-in.
const SESSION_KEY = 'plain-board-session';

// Two sample accounts, because a manager and a member of the team are shown different things.
const DEMO_USERS = {
  manager: {
    name: 'Rowan Adeyemi',
    role: 'Service manager',
    team: 'Support',
    manager: true,
    person: null
  },
  member: {
    name: 'Ada Nkemelu',
    role: 'Service desk',
    team: 'Support',
    manager: false,
    person: 'Ada Nkemelu'
  }
};

function readSession() {
  try {
    return JSON.parse(localStorage.getItem(SESSION_KEY));
  } catch {
    return null;
  }
}

function startSession(user) {
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(user));
    return true;
  } catch {
    return false;
  }
}

const startDemoSession = (kind) => startSession(DEMO_USERS[kind] || DEMO_USERS.member);

function endSession() {
  try {
    localStorage.removeItem(SESSION_KEY);
  } catch {
    // Nothing to clear if storage is blocked.
  }
}

// Runs in the <head> so nobody sees a flash of the wrong page.
const pageType = document.documentElement.dataset.page;
const signedIn = readSession();
// The signed-in pages live in pages/, so the way back out is one level up.
const SIGN_IN_PAGE = '../index.html';
const HOME_PAGE = pageType === 'app' ? 'today.html' : 'pages/today.html';

if (pageType === 'app' && !signedIn) location.replace(SIGN_IN_PAGE);
if (pageType === 'auth' && signedIn) location.replace(HOME_PAGE);
// Pages marked manager-only send everybody else back to the landing page.
if (document.documentElement.dataset.access === 'manager' && signedIn && !signedIn.manager) location.replace('today.html');
