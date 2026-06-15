'use client';

import { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/lib/store/auth.store';
import { authApi } from '@/lib/api/auth.api';

function OAuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const login = useAuthStore((state) => state.login);

  useEffect(() => {
    const accessToken = searchParams?.get('accessToken');
    const refreshToken = searchParams?.get('refreshToken');

    if (accessToken && refreshToken) {
      // Set the refresh token cookie
      document.cookie = `ata-refresh-token=${refreshToken}; path=/; max-age=604800; samesite=lax`;

      // We need to fetch the user profile since OAuth only returns tokens in URL
      authApi
        .me()
        .then((user) => {
          login(accessToken, refreshToken, user);
          router.push('/dashboard');
        })
        .catch(() => {
          router.push('/login?error=OAuthFailed');
        });
    } else {
      router.push('/login?error=OAuthMissingTokens');
    }
  }, [searchParams, login, router]);

  return (
    <div className="flex h-screen w-full items-center justify-center">
      <div className="text-center">
        <h2 className="text-2xl font-semibold tracking-tight">Authenticating...</h2>
        <p className="text-muted-foreground mt-2">Please wait while we log you in.</p>
      </div>
    </div>
  );
}

export default function OAuthCallbackPage() {
  return (
    <Suspense fallback={
      <div className="flex h-screen w-full items-center justify-center">
        <p>Loading...</p>
      </div>
    }>
      <OAuthCallbackContent />
    </Suspense>
  );
}
