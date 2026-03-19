import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { LoginButton } from "@/components/login-button";

export default async function LoginPage() {
  const session = await auth();
  if (session) redirect("/dashboard");

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
        <div className="text-6xl mb-4">📚</div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          材料科学論文ダイジェスト
        </h1>
        <p className="text-gray-500 mb-8 text-sm leading-relaxed">
          毎朝10分で重要論文を把握。<br />
          研究テーマに近い新着論文を見逃さない個人向けアシスタント。
        </p>
        <LoginButton />
        <p className="text-xs text-gray-400 mt-6">
          個人利用専用アプリケーション
        </p>
      </div>
    </div>
  );
}
