import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';

const UserRedirect = () => {
  const { username } = useParams<{ username: string }>();
  const navigate = useNavigate();

  useEffect(() => {
    const redirect = async () => {
      if (!username) {
        navigate('/users', { replace: true });
        return;
      }

      const { data } = await supabase
        .from('public_profiles' as any)
        .select('numeric_id')
        .eq('username', username)
        .maybeSingle();

      if (data) {
        navigate(`/profile/${data.numeric_id}`, { replace: true });
      } else {
        navigate('/users', { replace: true });
      }
    };

    redirect();
  }, [username, navigate]);

  return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
    </div>
  );
};

export default UserRedirect;
