import React, { useState, useEffect, useRef } from "react";
import Webcam from "react-webcam";
import io from "socket.io-client";
import "./App.css";

// 🔴 CRITICAL FIX: Grab the library from the browser window
// (Since we removed the import, we must define it here)
const faceapi = window.faceapi;

// --- DEPLOYMENT CONFIGURATION ---
const BACKEND_URL = "https://ark-chat-ikzt.onrender.com";

const socket = io.connect(BACKEND_URL);

function App() {
  // --- STATE ---
  const [filter, setFilter] = useState("Any");
  const [deviceId, setDeviceId] = useState("");
  const [userProfile, setUserProfile] = useState(null);

  // App Flow State
  const [view, setView] = useState("VERIFY"); // 'VERIFY', 'PROFILE', 'LOBBY', 'CHAT'
  const [nickname, setNickname] = useState("");
  const [bio, setBio] = useState("");

  // Chat State
  const [roomID, setRoomID] = useState(null);
  const [message, setMessage] = useState("");
  const [messageList, setMessageList] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  // Camera & AI State
  const webcamRef = useRef(null);
  const [selfieImage, setSelfieImage] = useState(null);
  const [resultMessage, setResultMessage] = useState(null);
  const [statusClass, setStatusClass] = useState("");
  const [isModelsLoaded, setIsModelsLoaded] = useState(false);

  // --- 1. INITIALIZATION ---
  useEffect(() => {
    // Device ID
    let storedId = localStorage.getItem("klymo_device_id");
    if (!storedId) {
      storedId = "dev_" + Math.random().toString(36).substr(2, 9);
      localStorage.setItem("klymo_device_id", storedId);
    }
    setDeviceId(storedId);

    // Check Memory
    const savedProfileStr = localStorage.getItem("klymo_user_profile");
    if (savedProfileStr) {
      const parsedProfile = JSON.parse(savedProfileStr);
      setUserProfile(parsedProfile);
      if (parsedProfile.nickname) {
        setNickname(parsedProfile.nickname);
        setBio(parsedProfile.bio);
        setView("LOBBY");
      }
    }

    // Load AI
    const loadModels = async () => {
      const MODEL_URL = "/models";
      try {
        // Double check faceapi exists before using it
        if (!faceapi) {
          console.error(
            "FaceAPI not found. Did you add the script to index.html?",
          );
          return;
        }

        await Promise.all([
          faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
          faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
          faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
          faceapi.nets.ageGenderNet.loadFromUri(MODEL_URL),
        ]);
        setIsModelsLoaded(true);
      } catch (error) {
        console.error("Error loading models:", error);
      }
    };
    loadModels();

    // --- SOCKET LISTENERS ---
    socket.on("match_found", (data) => {
      setRoomID(data.roomID);
      setIsSearching(false);
      setMessageList([]); // Clear previous chat
      setView("CHAT");
    });

    socket.on("receive_message", (data) => {
      setMessageList((list) => [...list, data]);
    });

    socket.on("partner_left", () => {
      // Optional: You could show a specialized UI here
      // For now, the system message handles the notification
    });

    // Cleanup
    return () => {
      socket.off("match_found");
      socket.off("receive_message");
      socket.off("partner_left");
    };
  }, []);

  // --- 2. CAMERA & AI LOGIC ---
  const capture = React.useCallback(() => {
    const imageSrc = webcamRef.current.getScreenshot();
    setSelfieImage(imageSrc);
    setResultMessage(null);
  }, [webcamRef]);

  const retake = () => {
    setSelfieImage(null);
    setResultMessage(null);
  };

  const handleProcess = async () => {
    if (!selfieImage) return;
    setResultMessage("Analyzing Identity... 🕵️‍♂️");
    setStatusClass("");

    try {
      const img = await faceapi.fetchImage(selfieImage);
      const detection = await faceapi
        .detectSingleFace(img)
        .withFaceLandmarks()
        .withFaceDescriptor()
        .withAgeAndGender();

      setSelfieImage(null); // Privacy Rule

      if (!detection) {
        setResultMessage("❌ No face detected. Try again.");
        setStatusClass("result-error");
        return;
      }

      const { gender, descriptor } = detection;
      const genderText = gender === "male" ? "Male" : "Female";

      if (!userProfile) {
        const newProfile = {
          gender: genderText,
          descriptor: Array.from(descriptor),
        };
        localStorage.setItem("klymo_user_profile", JSON.stringify(newProfile));
        setUserProfile(newProfile);
        setResultMessage(`✅ Verified! Setup profile.`);
        setStatusClass("result-success");
        setTimeout(() => setView("PROFILE"), 1500);
        return;
      }

      if (userProfile) {
        if (genderText !== userProfile.gender) {
          setResultMessage(`⛔ Wrong Gender. Locked to ${userProfile.gender}.`);
          setStatusClass("result-error");
          return;
        }
        const savedDescriptor = new Float32Array(userProfile.descriptor);
        const distance = faceapi.euclideanDistance(descriptor, savedDescriptor);

        if (distance < 0.45) {
          setResultMessage(`✅ Welcome back, ${userProfile.gender}!`);
          setStatusClass("result-success");
          setTimeout(() => {
            userProfile.nickname ? setView("LOBBY") : setView("PROFILE");
          }, 1000);
        } else {
          setResultMessage(`⛔ Face Mismatch. Access Denied.`);
          setStatusClass("result-error");
        }
      }
    } catch (error) {
      console.error(error);
      setResultMessage("System Error.");
      setStatusClass("result-error");
    }
  };

  // --- 3. PROFILE LOGIC ---
  const saveProfile = () => {
    if (!nickname || !bio) {
      alert("Please fill in both fields.");
      return;
    }
    const updatedProfile = { ...userProfile, nickname, bio };
    localStorage.setItem("klymo_user_profile", JSON.stringify(updatedProfile));
    setUserProfile(updatedProfile);
    setView("LOBBY");
  };

  // --- 4. MATCHMAKING LOGIC ---
  const joinQueue = () => {
    setIsSearching(true);
    socket.emit("join_queue", {
      nickname: nickname,
      gender: userProfile.gender,
      genderFilter: filter,
      deviceId: deviceId, // <--- Send Device ID for limits
    });
  };

  const sendMessage = async () => {
    if (message !== "") {
      const messageData = {
        roomID: roomID,
        sender: nickname,
        message: message,
        time:
          new Date(Date.now()).getHours() +
          ":" +
          new Date(Date.now()).getMinutes(),
      };
      await socket.emit("send_message", messageData);
      setMessageList((list) => [...list, messageData]);
      setMessage("");
    }
  };

  // --- 5. RESET ---
  const clearData = () => {
    if (window.confirm("Reset Device?")) {
      localStorage.removeItem("klymo_user_profile");
      setUserProfile(null);
      setNickname("");
      setBio("");
      setView("VERIFY");
      setResultMessage(null);
      setSelfieImage(null);
    }
  };

  // --- RENDER ---
  return (
    <div className="glass-container">
      {/* HEADER: UPDATED BRANDING */}
      <h1>
        ARK
        <span
          style={{
            display: "block",
            fontSize: "0.9rem",
            fontWeight: "300",
            letterSpacing: "2px",
            marginTop: "5px",
            opacity: "0.8",
          }}
        >
          Controlled Anonymity
        </span>
      </h1>

      {/* VIEW 1: VERIFICATION */}
      {view === "VERIFY" && (
        <>
          <div className="camera-frame">
            {isModelsLoaded ? (
              !selfieImage ? (
                <Webcam
                  audio={false}
                  ref={webcamRef}
                  screenshotFormat="image/jpeg"
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              ) : (
                <img
                  src={selfieImage}
                  alt="Captured"
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              )
            ) : (
              <div className="loading-text">Loading AI...</div>
            )}
          </div>
          <div className="btn-group">
            {!selfieImage ? (
              <button
                onClick={capture}
                disabled={!isModelsLoaded}
                className="primary"
              >
                📸 Capture
              </button>
            ) : (
              <>
                <button onClick={retake}>Retake</button>
                <button onClick={handleProcess} className="success">
                  {userProfile ? "Login" : "Register"}
                </button>
              </>
            )}
          </div>
          {resultMessage && (
            <div className={`result-box ${statusClass}`}>
              <h3>{resultMessage}</h3>
            </div>
          )}
        </>
      )}

      {/* VIEW 2: PROFILE */}
      {view === "PROFILE" && (
        <div style={{ padding: "20px" }}>
          <h2>Setup Identity</h2>
          <input
            type="text"
            placeholder="Nickname"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            style={inputStyle}
          />
          <textarea
            placeholder="Bio"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            style={{ ...inputStyle, height: "80px" }}
          />
          <button
            onClick={saveProfile}
            className="success"
            style={{ width: "100%" }}
          >
            Enter Lobby 🚀
          </button>
        </div>
      )}

      {/* VIEW 3: LOBBY */}
      {view === "LOBBY" && (
        <div style={{ padding: "20px" }}>
          <div className="badge badge-secure">🟢 Online: {nickname}</div>

          {isSearching ? (
            <div style={{ margin: "40px 0" }}>
              <h3>Searching for {filter}... 🔭</h3>
              <div className="loader"></div>
              <button
                onClick={() => {
                  setIsSearching(false);
                  socket.emit("disconnect"); // Quick way to leave queue
                  window.location.reload(); // Hard reset state
                }}
                style={{
                  marginTop: "20px",
                  background: "transparent",
                  border: "1px solid #ff5252",
                  color: "#ff5252",
                }}
              >
                Cancel
              </button>
            </div>
          ) : (
            <>
              <p style={{ margin: "30px 0" }}>Who do you want to chat with?</p>

              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "10px",
                }}
              >
                <button
                  onClick={() => {
                    setFilter("Any");
                    joinQueue();
                  }}
                  className={filter === "Any" ? "primary" : ""}
                >
                  🎲 Random Match (Any)
                </button>

                <button
                  onClick={() => {
                    setFilter("Male");
                    joinQueue();
                  }}
                  style={{
                    border: "1px solid #42a5f5",
                    background: "rgba(66, 165, 245, 0.1)",
                  }}
                >
                  👨 Chat with Male
                </button>

                <button
                  onClick={() => {
                    setFilter("Female");
                    joinQueue();
                  }}
                  style={{
                    border: "1px solid #ec407a",
                    background: "rgba(236, 64, 122, 0.1)",
                  }}
                >
                  👩 Chat with Female
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* VIEW 4: CHAT */}
      {view === "CHAT" && (
        <div className="chat-container">
          <div className="chat-header">
            <h3>Connected! 🟢</h3>
            <div style={{ display: "flex", gap: "10px" }}>
              <button
                onClick={() => {
                  if (window.confirm("Report this user?")) {
                    socket.emit("report_user");
                    setMessageList([]);
                    setView("LOBBY");
                  }
                }}
                style={{
                  padding: "5px 10px",
                  fontSize: "0.8rem",
                  background: "#ff5252",
                  border: "none",
                }}
              >
                ⚠️ Report
              </button>

              <button
                onClick={() => {
                  setMessageList([]);
                  joinQueue();
                }}
                style={{
                  padding: "5px 10px",
                  fontSize: "0.8rem",
                  background: "#42a5f5",
                  border: "none",
                }}
              >
                ⏩ Next
              </button>

              <button
                onClick={() => {
                  window.location.reload();
                }}
                style={{ padding: "5px 10px", fontSize: "0.8rem" }}
              >
                ❌ Leave
              </button>
            </div>
          </div>

          <div className="chat-body">
            {messageList.map((msg, index) => (
              <div
                key={index}
                className={`message ${msg.sender === nickname ? "you" : "other"}`}
              >
                <div className="msg-content">
                  <p>{msg.message}</p>
                </div>
                <div className="msg-meta">
                  <p>
                    {msg.time} - {msg.sender}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className="chat-footer">
            <input
              type="text"
              value={message}
              placeholder="Type a message..."
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && sendMessage()}
            />
            <button onClick={sendMessage}>➤</button>
          </div>
        </div>
      )}

      {view !== "CHAT" && (
        <div onClick={clearData} className="reset-link">
          [Dev] Reset Device
        </div>
      )}
    </div>
  );
}

const inputStyle = {
  width: "100%",
  padding: "12px",
  marginBottom: "15px",
  borderRadius: "8px",
  border: "1px solid rgba(255,255,255,0.3)",
  background: "rgba(0,0,0,0.3)",
  color: "white",
};

export default App;
