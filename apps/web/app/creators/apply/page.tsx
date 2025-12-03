// apps/web/app/creators/apply/page.tsx

import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Apply to Stream · WeGoLive',
  description:
    'Become a streamer on WeGoLiveToday. Tell us about your content, schedule, and share your social profiles.',
};

export default function ApplyToStreamPage() {
  return (
    <main className="min-h-[calc(100vh-0px)] px-4 py-10">
      <div className="mx-auto w-full max-w-2xl rounded-xl border border-zinc-800 bg-zinc-950/70 p-6 shadow-xl">

        {/* Header */}
        <div className="mb-6">
          <div className="inline-flex items-center gap-2">
            <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
            <span className="text-lg font-semibold tracking-tight text-white">WeGoLive</span>
          </div>
          <h1 className="mt-3 text-2xl font-semibold text-white">Apply to become a streamer</h1>
          <p className="mt-1 text-sm text-zinc-400">
            Tell us about yourself and your content. We usually review applications within 24–48 hours.
          </p>
        </div>

        {/* Form */}
        <form
          className="mt-2 space-y-6"
          method="post"
          action="/creators/apply/submit"
          aria-label="Streamer application form"
        >
          {/* Basics */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label htmlFor="displayName" className="block text-sm text-zinc-300">Display name</label>
              <input
                id="displayName"
                name="displayName"
                required
                placeholder="e.g. creator_miles"
                autoComplete="off"
                className="mt-1 w-full rounded-md border border-zinc-800 bg-zinc-900 px-3 py-2 text-zinc-200 placeholder-zinc-500 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30"
              />
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="email" className="block text-sm text-zinc-300">Email</label>
              <input
                id="email"
                name="email"
                type="email"
                required
                placeholder="you@example.com"
                autoComplete="email"
                className="mt-1 w-full rounded-md border border-zinc-800 bg-zinc-900 px-3 py-2 text-zinc-200 placeholder-zinc-500 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30"
              />
            </div>

            <div>
              <label htmlFor="category" className="block text-sm text-zinc-300">Primary category</label>
              <select
                id="category"
                name="category"
                required
                className="mt-1 w-full rounded-md border border-zinc-800 bg-zinc-900 px-3 py-2 text-zinc-200 outline-none focus:border-emerald-500"
              >
                <option value="">Select a category</option>
                <option>IRL</option>
                <option>Gaming</option>
                <option>Music</option>
                <option>Coding</option>
                <option>Talk Shows</option>
                <option>Sports</option>
              </select>
            </div>

            <div>
              <label htmlFor="schedule" className="block text-sm text-zinc-300">How often will you stream?</label>
              <select
                id="schedule"
                name="schedule"
                required
                className="mt-1 w-full rounded-md border border-zinc-800 bg-zinc-900 px-3 py-2 text-zinc-200 outline-none focus:border-emerald-500"
              >
                <option value="">Choose frequency</option>
                <option>Daily</option>
                <option>3–5 times / week</option>
                <option>1–2 times / week</option>
                <option>Occasionally</option>
              </select>
            </div>
          </div>

          {/* Pitch */}
          <div>
            <label htmlFor="pitch" className="block text-sm text-zinc-300">Pitch (what will you stream?)</label>
            <textarea
              id="pitch"
              name="pitch"
              rows={4}
              required
              placeholder="Describe your content, typical stream length, equipment, and goals…"
              className="mt-1 w-full rounded-md border border-zinc-800 bg-zinc-900 px-3 py-2 text-zinc-200 placeholder-zinc-500 outline-none focus:border-emerald-500"
            />
          </div>

          {/* Social Profiles */}
          <div>
            <div className="mb-2 flex items-baseline justify-between">
              <h2 className="text-sm font-medium text-white">Social profiles</h2>
              <p className="text-xs text-zinc-400">Add @handle <span className="text-zinc-500">or</span> a full URL (optional)</p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {[
                { id: 'instagram', label: 'Instagram', placeholder: '@yourhandle or https://instagram.com/yourhandle' },
                { id: 'tiktok', label: 'TikTok', placeholder: '@yourhandle or https://www.tiktok.com/@yourhandle' },
                { id: 'youtube', label: 'YouTube', placeholder: 'https://youtube.com/@handle or channel URL' },
                { id: 'twitch', label: 'Twitch', placeholder: 'https://twitch.tv/yourchannel' },
                { id: 'x', label: 'X (Twitter)', placeholder: '@yourhandle or https://x.com/yourhandle' },
                { id: 'facebook', label: 'Facebook', placeholder: 'https://facebook.com/yourpage' },
                { id: 'snapchat', label: 'Snapchat', placeholder: '@yourhandle or https://www.snapchat.com/add/yourhandle' },
                { id: 'website', label: 'Portfolio / Website', placeholder: 'https://your-site.com' },
              ].map(({ id, label, placeholder }) => (
                <div key={id}>
                  <label htmlFor={id} className="block text-sm text-zinc-300">{label}</label>
                  <input
                    id={id}
                    name={id}
                    placeholder={placeholder}
                    className="mt-1 w-full rounded-md border border-zinc-800 bg-zinc-900 px-3 py-2 text-zinc-200 placeholder-zinc-500 outline-none focus:border-emerald-500"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Agreement */}
          <div className="pt-1">
            <label
              htmlFor="agree"
              className="flex flex-wrap items-start gap-2 text-sm text-zinc-300 leading-relaxed"
            >
              <input
                id="agree"
                name="agree"
                type="checkbox"
                required
                className="mt-1 h-4 w-4 rounded border-zinc-700 bg-zinc-900 text-emerald-500 focus:ring-emerald-500"
              />
              <span className="min-w-0 break-words whitespace-normal">
                I agree to the{' '}
                <Link href="/terms" className="text-emerald-400 hover:text-emerald-300">Terms</Link>{' '}
                and{' '}
                <Link href="/community-guidelines" className="text-emerald-400 hover:text-emerald-300">Community Guidelines</Link>.
              </span>
            </label>
          </div>

          {/* Submit */}
          <div className="pt-1">
            <button className="btn btn-primary w-full sm:w-auto">Submit application</button>
          </div>

          {/* Already streaming link */}
          <p className="text-sm text-zinc-400 pt-4">
            Already streaming?{' '}
            <Link href="/login" className="text-emerald-400 hover:text-emerald-300">Sign in</Link>
          </p>
        </form>
      </div>
    </main>
  );
}
