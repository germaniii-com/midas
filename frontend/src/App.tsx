import { Routes, Route, Navigate } from "react-router-dom";
import HomePage from "./pages/home";
import CreateBinder from "./pages/create-binder";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/create" element={<CreateBinder />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
