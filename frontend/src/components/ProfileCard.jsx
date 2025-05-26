import React from 'react';

export default function ProfileCard() {
  return (
    <div className="max-w-sm mx-auto bg-white rounded-xl shadow-md overflow-hidden hover:shadow-xl transition-shadow duration-300">
      <div className="flex items-center space-x-4 p-6">
        <img
          className="h-16 w-16 rounded-full object-cover"
          src="https://randomuser.me/api/portraits/men/75.jpg"
          alt="Profile"
        />
        <div>
          <h1 className="text-xl font-semibold text-gray-900">John Doe</h1>
          <p className="text-gray-500">Frontend Developer</p>
          <p className="mt-2 text-gray-700 text-sm">
            Passionate about building scalable and beautiful web apps with React and Tailwind.
          </p>
          <button className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition">
            Connect
          </button>
        </div>
      </div>
    </div>
  );
}
