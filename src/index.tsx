// eslint-disable-next-line @typescript-eslint/no-unused-vars
import adapter from "webrtc-adapter";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Producer from "./examples/broadcast/Producer";
import Consumer from "./examples/broadcast/Consumer";
import Conference from "./examples/conference/Conference";
import App from "./App";
import React from "react";

const root = ReactDOM.createRoot(
  document.getElementById("root") as HTMLElement
);

root.render(
  <BrowserRouter>
    <Routes>
      <Route index path="/" element={<App />} />
      <Route path="/conference" element={<Conference />} />
      <Route path="/stream" element={<Producer />} />
      <Route path="/watch" element={<Consumer />} />
    </Routes>
  </BrowserRouter>
);
