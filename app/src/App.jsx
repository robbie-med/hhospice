import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Certify from './pages/Certify';
import Patients from './pages/Patients';
import GocNote from './pages/GocNote';
import Amorm from './pages/Amorm';
import TtbDp from './pages/TtbDp';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Dashboard />} />
        <Route path="certify" element={<Certify />} />
        <Route path="patients" element={<Patients />} />
        <Route path="goc" element={<GocNote />} />
        <Route path="amorm" element={<Amorm />} />
        <Route path="ttbdp" element={<TtbDp />} />
      </Route>
    </Routes>
  );
}
