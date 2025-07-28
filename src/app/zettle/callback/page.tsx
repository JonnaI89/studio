
import { Suspense } from 'react';
import { ZettleCallbackHandler } from '@/components/kartpass/zettle-callback-handler';

export default function ZettleCallbackPage() {
    return (
        <Suspense fallback={<div>Laster...</div>}>
            <ZettleCallbackHandler />
        </Suspense>
    );
}
