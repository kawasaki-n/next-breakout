import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  // GitHub Pagesのリポジトリ名がURLに含まれる場合に必要
  // 例: https://username.github.io/block-game/
  // リポジトリ名が変わる場合は適宜変更してください
  basePath: process.env.GITHUB_REPOSITORY
    ? `/${process.env.GITHUB_REPOSITORY.split("/")[1]}`
    : "",
  // 画像の最適化を無効化（静的エクスポート時に必要）
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
