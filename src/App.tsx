import { useEffect } from 'react';
import { useAppStore } from './store/appStore';
import { useComputed } from './hooks/useComputed';
import { Auth } from './components/Auth';
import { Topbar } from './components/Topbar';
import { Menu } from './components/Menu';
import { BottomNav } from './components/BottomNav';
import { Home } from './screens/Home';
import { Expense } from './screens/Expense';
import { Habit } from './screens/Habit';
import { Budget } from './screens/Budget';
import { Report } from './screens/Report';
import { Annual } from './screens/Annual';
import { Invest } from './screens/Invest';
import { Salary } from './screens/Salary';
import { SalarySettings } from './screens/SalarySettings';
import { GoalSettings } from './screens/GoalSettings';

function Screens() {
  const v = useComputed();
  let screen;
  if (v.isHome) screen = <Home v={v} />;
  else if (v.isExpense) screen = <Expense v={v} />;
  else if (v.isHabit) screen = <Habit v={v} />;
  else if (v.isBudget) screen = <Budget v={v} />;
  else if (v.isReport) screen = <Report v={v} />;
  else if (v.isAnnual) screen = <Annual v={v} />;
  else if (v.isInvest) screen = <Invest v={v} />;
  else if (v.isSalarySettings) screen = <SalarySettings v={v} />;
  else if (v.isGoalSettings) screen = <GoalSettings v={v} />;
  else screen = <Salary v={v} />;

  return (
    <>
      <Topbar />
      <div id="content">{screen}</div>
      <div id="menu"><Menu v={v} /></div>
      <BottomNav v={v} />
    </>
  );
}

function LoadingScreen() {
  return (
    <div className="loading-screen">
      <div className="loading-mark">KAKEIBO</div>
      <div className="loading-spinner" />
    </div>
  );
}

export function App() {
  const authReady = useAppStore((st) => st.authReady);
  const session = useAppStore((st) => st.session);
  const state = useAppStore((st) => st.state);
  const bootstrap = useAppStore((st) => st.bootstrap);

  useEffect(() => { bootstrap(); }, [bootstrap]);

  if (!authReady) return <div id="phone"><LoadingScreen /></div>;
  if (!session || !state) return <div id="phone"><div id="content"><Auth /></div></div>;
  return (
    <div id="phone">
      <Screens />
    </div>
  );
}
