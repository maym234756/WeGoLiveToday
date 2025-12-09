'use client';

import * as React from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { logSupabaseError } from '@/utils/logError';


export default function SignupForm() {
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const form = e.currentTarget;
      const data = new FormData(form);

      const email = String(data.get('email') || '');
      const password = String(data.get('password') || '');
      const confirm = String(data.get('confirm') || '');
      const firstName = String(data.get('firstName') || '');
      const lastName = String(data.get('lastName') || '');
      const gender = String(data.get('gender') || '');
      const dob = String(data.get('dob') || '');
      const adultAck = data.get('adult_ack');

      // --- Validation ---
      if (password.length < 8) {
        setError('Password must be at least 8 characters.');
        return;
      }
      if (password !== confirm) {
        setError('Passwords do not match.');
        return;
      }
      if (!dob) {
        setError('Please enter your date of birth.');
        return;
      }
      if (!adultAck) {
        setError('You must acknowledge adult content to continue.');
        return;
      }

      const fullName = `${firstName} ${lastName}`.trim();

      // --- SUPABASE SIGNUP ---
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            firstName,
            lastName,
            gender,
            name: fullName,
            dob,
            adult_ack: true,
          },
        },
      });

      if (signUpError) {
        setError(signUpError.message);
        return;
      }

      const userId = signUpData?.user?.id;
      if (!userId) {
        setError("Auth session missing!");
        return;
      }

const numericId = Date.now(); // Define it here so it's available later

try {
  const { error } = await supabase.from('User Signup List').insert([
    {
      id: numericId,
      email: email,
      name: `${firstName} ${lastName}`,
      first_name: firstName,
      last_name: lastName,
      gender: gender,
      dob: dob,
      is_pro: false,
      signed_up_at: new Date().toISOString(),
      auth_user_id: userId,
    },
  ]);

  if (error) {
    logSupabaseError('Insert into User Signup List failed', error);
    throw new Error('Custom table insert failed.');
  }

  console.log('✅ Inserted into custom table!');
} catch (err: any) {
  console.error('📛 Insert block error:', err.message || err);
}

      // Update metadata if session available
      if (signUpData?.session) {
        await supabase.auth.updateUser({
          data: {
            firstName,
            lastName,
            gender,
            name: fullName,
            dob,
            adult_ack: true,
          },
        });
      }


      // Redirect
      window.location.href = `/dashboard/${numericId}`;

    } catch (err: any) {
      console.error("Unexpected error:", err);
      setError("Unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md rounded-xl border border-zinc-800 bg-zinc-950 p-6 shadow-xl">
      <div className="mb-6 text-center">
        <div className="inline-flex items-center gap-2">
          <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
          <span className="text-lg font-semibold tracking-tight text-white">WeGoLive</span>
        </div>
        <h1 className="mt-4 text-2xl font-semibold text-white">Create your account</h1>
        <p className="mt-1 text-sm text-zinc-400">It only takes a minute.</p>
      </div>

      <form onSubmit={onSubmit} className="space-y-4 text-sm text-zinc-300">

        {/* First Name */}
        <div className="flex flex-col gap-1">
          <label htmlFor="firstName">First Name</label>
          <input
            id="firstName"
            name="firstName"
            required
            placeholder="John"
            className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-white"
          />
        </div>

        {/* Last Name */}
        <div className="flex flex-col gap-1">
          <label htmlFor="lastName">Last Name</label>
          <input
            id="lastName"
            name="lastName"
            required
            placeholder="Doe"
            className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-white"
          />
        </div>

        {/* Gender */}
        <div className="flex flex-col gap-1">
          <label htmlFor="gender">Gender</label>
          <select
            id="gender"
            name="gender"
            required
            className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-white"
          >
            <option value="">Select gender</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="other">Other</option>
          </select>
        </div>

        {/* Email */}
        <div className="flex flex-col gap-1">
          <label htmlFor="email">Email</label>
          <input
            id="email"
            name="email"
            type="email"
            required
            placeholder="you@example.com"
            className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-white"
          />
        </div>

        {/* Password */}
        <div className="flex flex-col gap-1">
          <label htmlFor="password">Password</label>
          <input
            id="password"
            name="password"
            type="password"
            required
            placeholder="At least 8 characters"
            className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-white"
          />
        </div>

        {/* Confirm Password */}
        <div className="flex flex-col gap-1">
          <label htmlFor="confirm">Confirm Password</label>
          <input
            id="confirm"
            name="confirm"
            type="password"
            required
            placeholder="••••••••"
            className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-white"
          />
        </div>

        {/* DOB */}
        <div className="flex flex-col gap-1">
          <label htmlFor="dob">Date of Birth</label>
          <input
            id="dob"
            name="dob"
            type="date"
            required
            className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-white"
          />
        </div>

        {/* Terms & Adult Acknowledgment */}
        <div className="space-y-3 pt-2">
          <label className="flex items-start gap-2">
            <input type="checkbox" name="terms" required className="mt-1 h-4 w-4" />
            <span>
              I agree to the{' '}
              <Link href="/terms" className="text-emerald-400 hover:underline">Terms</Link> and{' '}
              <Link href="/privacy" className="text-emerald-400 hover:underline">Privacy</Link>.
            </span>
          </label>

          <label className="flex items-start gap-2">
            <input type="checkbox" name="adult_ack" required className="mt-1 h-4 w-4" />
            <span>I acknowledge that adult content exists within WeGoLiveToday.</span>
          </label>
        </div>

        {/* Error message */}
        {error && <p className="text-sm text-rose-400">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="btn btn-primary w-full disabled:opacity-40"
        >
          {loading ? 'Creating Account...' : 'Create Account'}
        </button>
      </form>

      {/* Footer */}
      <div className="mt-6 text-center text-sm text-zinc-400">
        Already have an account?{' '}
        <Link href="/login" className="text-emerald-400 hover:text-emerald-300">Sign in</Link>
        <br />
        <Link
          href="/guest-dashboard"
          className="mt-3 inline-block border border-zinc-800 bg-zinc-900 px-3 py-2 rounded-md text-zinc-200 hover:bg-zinc-800/70"
        >
          Continue as guest
        </Link>
      </div>
    </div>
  );
}
