export default function Home() {
  return (
    <main className="min-h-screen bg-white px-6 py-8 md:px-10 md:py-12">
      {/* Hero */}
      <section className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-6xl items-center justify-center px-6 py-10 md:px-16 md:py-14">
        <div className="flex w-full max-w-4xl flex-col items-center gap-8 md:gap-12">
          <h1 className="text-center text-4xl font-normal tracking-tight text-[#2f9e44] sm:text-5xl md:text-6xl">
            A robot that eats cereal
          </h1>
          <p className="text-center text-lg text-gray-600 max-w-2xl">
            Hand gesture recognition for vision-language-action robot control
          </p>
          <div className="flex h-[280px] w-full items-center justify-center rounded-[2.75rem] border-[10px] border-[#2f9e44] bg-white sm:h-[360px] md:h-[420px]">
            <p className="px-6 text-center text-lg text-[#2f9e44] sm:text-xl">
              Video placeholder
            </p>
          </div>
          <p className="text-sm text-gray-400">
            Travis Ha, Jason Chan, Sonav Agarwal, Pravir Chugh &mdash; CS 188 Spring 2026
          </p>
        </div>
      </section>

      {/* Overview */}
      <section className="mx-auto max-w-4xl py-16 px-6">
        <h2 className="text-3xl font-semibold text-gray-900 mb-6">Overview</h2>
        <p className="text-gray-700 leading-relaxed mb-4">
          We integrate visual hand gesture recognition into a vision-language-action model to
          perform cereal-related tasks on a Franka Arm. A user shows ASL hand signs to specify
          commands (pick up a bowl, pour cereal, grab a cup), confirms with a thumbs-up, and the
          robot executes the task autonomously using Physical Intelligence&apos;s pi0.5 model.
        </p>
        <p className="text-gray-700 leading-relaxed">
          The gesture pipeline uses MediaPipe for hand landmark detection, a template-matching
          recognizer for ASL letter classification, a voting-based smoother to filter noise, and a
          confirmation state machine to prevent accidental commands.
        </p>
      </section>

      {/* Gesture Mapping */}
      <section className="mx-auto max-w-4xl py-16 px-6">
        <h2 className="text-3xl font-semibold text-gray-900 mb-6">Gesture Mapping</h2>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b-2 border-[#2f9e44]">
                <th className="py-3 pr-6 text-sm font-semibold text-gray-900">ASL Sign</th>
                <th className="py-3 pr-6 text-sm font-semibold text-gray-900">Robot Command</th>
                <th className="py-3 text-sm font-semibold text-gray-900">Description</th>
              </tr>
            </thead>
            <tbody className="text-gray-700">
              <tr className="border-b border-gray-200">
                <td className="py-3 pr-6 font-mono font-bold text-[#2f9e44]">F</td>
                <td className="py-3 pr-6">Fruit Loops</td>
                <td className="py-3">Pick up / pour the Fruit Loops cereal</td>
              </tr>
              <tr className="border-b border-gray-200">
                <td className="py-3 pr-6 font-mono font-bold text-[#2f9e44]">K</td>
                <td className="py-3 pr-6">Cocoa Krispies</td>
                <td className="py-3">Pick up / pour the Cocoa Krispies cereal</td>
              </tr>
              <tr className="border-b border-gray-200">
                <td className="py-3 pr-6 font-mono font-bold text-[#2f9e44]">B</td>
                <td className="py-3 pr-6">Blue Bowl</td>
                <td className="py-3">Pick up and place the blue bowl</td>
              </tr>
              <tr className="border-b border-gray-200">
                <td className="py-3 pr-6 font-mono font-bold text-[#2f9e44]">O</td>
                <td className="py-3 pr-6">Orange Bowl</td>
                <td className="py-3">Pick up and place the orange bowl</td>
              </tr>
              <tr className="border-b border-gray-200">
                <td className="py-3 pr-6 font-mono font-bold text-[#2f9e44]">C</td>
                <td className="py-3 pr-6">Cup</td>
                <td className="py-3">Pick up and place the cup</td>
              </tr>
              <tr>
                <td className="py-3 pr-6 font-mono font-bold text-amber-500">Thumbs Up</td>
                <td className="py-3 pr-6">Confirm</td>
                <td className="py-3">Confirm the pending gesture command</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* State Machine */}
      <section className="mx-auto max-w-4xl py-16 px-6">
        <h2 className="text-3xl font-semibold text-gray-900 mb-6">Confirmation State Machine</h2>
        <p className="text-gray-700 leading-relaxed mb-8">
          To prevent accidental commands, every gesture must be confirmed with a thumbs-up before
          the robot acts. The state machine ensures intentional control.
        </p>
        <div className="flex justify-center mb-8">
          <svg viewBox="0 0 720 320" className="w-full max-w-2xl" xmlns="http://www.w3.org/2000/svg">
            {/* Nodes */}
            {/* IDLE */}
            <rect x="20" y="120" width="160" height="80" rx="16" fill="#f3f4f6" stroke="#9ca3af" strokeWidth="2.5" />
            <text x="100" y="155" textAnchor="middle" className="text-base" fill="#374151" fontWeight="600" fontSize="18">IDLE</text>
            <text x="100" y="178" textAnchor="middle" fill="#6b7280" fontSize="12">Waiting for gesture</text>

            {/* PENDING */}
            <rect x="280" y="120" width="160" height="80" rx="16" fill="#fef3c7" stroke="#f59e0b" strokeWidth="2.5" />
            <text x="360" y="155" textAnchor="middle" fill="#92400e" fontWeight="600" fontSize="18">PENDING</text>
            <text x="360" y="178" textAnchor="middle" fill="#a16207" fontSize="12">Awaiting confirmation</text>

            {/* ACTIVE */}
            <rect x="540" y="120" width="160" height="80" rx="16" fill="#dcfce7" stroke="#2f9e44" strokeWidth="2.5" />
            <text x="620" y="155" textAnchor="middle" fill="#166534" fontWeight="600" fontSize="18">ACTIVE</text>
            <text x="620" y="178" textAnchor="middle" fill="#15803d" fontSize="12">Command running</text>

            {/* Arrows */}
            {/* IDLE -> PENDING */}
            <defs>
              <marker id="arrow" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto" fill="#374151">
                <polygon points="0 0, 10 3.5, 0 7" />
              </marker>
              <marker id="arrow-green" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto" fill="#2f9e44">
                <polygon points="0 0, 10 3.5, 0 7" />
              </marker>
              <marker id="arrow-amber" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto" fill="#f59e0b">
                <polygon points="0 0, 10 3.5, 0 7" />
              </marker>
              <marker id="arrow-gray" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto" fill="#9ca3af">
                <polygon points="0 0, 10 3.5, 0 7" />
              </marker>
            </defs>

            {/* IDLE -> PENDING: sign_* */}
            <line x1="180" y1="148" x2="278" y2="148" stroke="#374151" strokeWidth="2" markerEnd="url(#arrow)" />
            <text x="229" y="138" textAnchor="middle" fill="#374151" fontSize="13" fontWeight="500">sign_*</text>

            {/* PENDING -> ACTIVE: thumbs_up */}
            <line x1="440" y1="148" x2="538" y2="148" stroke="#2f9e44" strokeWidth="2" markerEnd="url(#arrow-green)" />
            <text x="489" y="138" textAnchor="middle" fill="#2f9e44" fontSize="13" fontWeight="500">thumbs up</text>

            {/* PENDING -> IDLE: timeout (curved arrow below) */}
            <path d="M 300 200 Q 200 280 100 200" fill="none" stroke="#9ca3af" strokeWidth="2" markerEnd="url(#arrow-gray)" strokeDasharray="6 3" />
            <text x="200" y="270" textAnchor="middle" fill="#9ca3af" fontSize="12">timeout</text>

            {/* ACTIVE -> PENDING: new sign_* (curved arrow above) */}
            <path d="M 560 120 Q 460 40 380 120" fill="none" stroke="#f59e0b" strokeWidth="2" markerEnd="url(#arrow-amber)" />
            <text x="470" y="55" textAnchor="middle" fill="#b45309" fontSize="13" fontWeight="500">new sign_*</text>

            {/* PENDING self-loop: different sign_* */}
            <path d="M 330 120 Q 320 60 360 60 Q 400 60 390 120" fill="none" stroke="#374151" strokeWidth="1.5" markerEnd="url(#arrow)" />
            <text x="360" y="48" textAnchor="middle" fill="#374151" fontSize="11">diff sign_*</text>
          </svg>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div className="rounded-xl bg-gray-50 p-4 border border-gray-200">
            <p className="font-semibold text-gray-900 mb-1">IDLE</p>
            <p className="text-gray-600">No command active. Show any ASL sign to begin.</p>
          </div>
          <div className="rounded-xl bg-amber-50 p-4 border border-amber-200">
            <p className="font-semibold text-amber-900 mb-1">PENDING</p>
            <p className="text-amber-700">Gesture detected, waiting for thumbs-up to confirm. Times out after ~1 second if hand is dropped.</p>
          </div>
          <div className="rounded-xl bg-green-50 p-4 border border-green-200">
            <p className="font-semibold text-green-900 mb-1">ACTIVE</p>
            <p className="text-green-700">Command confirmed and continuously sent to the robot over TCP until a new gesture is confirmed.</p>
          </div>
        </div>
      </section>

      {/* Pipeline */}
      <section className="mx-auto max-w-4xl py-16 px-6">
        <h2 className="text-3xl font-semibold text-gray-900 mb-6">Pipeline</h2>
        <div className="flex flex-wrap items-center justify-center gap-3 text-sm">
          {[
            "Webcam",
            "MediaPipe Hand Landmarks",
            "Template-Match Recognizer",
            "Voting Smoother",
            "State Machine",
            "TCP Stream",
            "pi0.5 VLA Model",
            "Franka Arm",
          ].map((step, i, arr) => (
            <span key={step} className="flex items-center gap-3">
              <span className="rounded-lg bg-gray-100 border border-gray-200 px-4 py-2 font-medium text-gray-800">
                {step}
              </span>
              {i < arr.length - 1 && (
                <span className="text-[#2f9e44] text-lg font-bold">&rarr;</span>
              )}
            </span>
          ))}
        </div>
      </section>

      {/* Tech Stack */}
      <section className="mx-auto max-w-4xl py-16 px-6 border-t border-gray-200">
        <h2 className="text-3xl font-semibold text-gray-900 mb-6">Tech Stack</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          {[
            { name: "MediaPipe", desc: "Hand landmark detection" },
            { name: "OpenCV", desc: "Video capture & display" },
            { name: "pi0.5", desc: "Vision-language-action model" },
            { name: "Franka Arm", desc: "Robotiq 2F-85 gripper" },
            { name: "Python", desc: "Gesture pipeline" },
            { name: "TCP Sockets", desc: "Gesture event streaming" },
            { name: "Next.js", desc: "Project website" },
            { name: "Meta Quest 2", desc: "Teleoperation demos" },
          ].map((tech) => (
            <div key={tech.name} className="rounded-xl bg-gray-50 p-4 border border-gray-200">
              <p className="font-semibold text-gray-900">{tech.name}</p>
              <p className="text-gray-500">{tech.desc}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
